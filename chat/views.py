from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Conversation, Message, Document
from .serializers import (
    UserSerializer, 
    ConversationSerializer, 
    ConversationListSerializer,
    MessageSerializer,
    DocumentSerializer
)
from .rag_service import NepaliRAGService
import logging
import threading

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """
    User registration endpoint.
    Returns user data and authentication token.
    """
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Create authentication token
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    User login endpoint.
    Validates credentials and returns token.
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Authenticate user
    user = authenticate(username=username, password=password)
    
    if user is not None:
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid credentials'}, 
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout endpoint.
    Deletes the user's authentication token.
    """
    request.user.auth_token.delete()
    return Response({'message': 'Successfully logged out'})







# ... existing auth views ...

class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing document uploads and processing.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        qs = Document.objects.filter(user=self.request.user)
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return qs
    
    def create(self, request, *args, **kwargs):
        """
        Handle PDF upload and trigger background processing.
        """
        file = request.FILES.get('file')
        conversation_id = request.data.get('conversation_id')

        conversation = None
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            except Conversation.DoesNotExist:
                return Response(
                    {'error': 'Invalid conversation'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        if not file.name.endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are supported'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create document record
        document = Document.objects.create(
            user=request.user,
            conversation=conversation,
            file=file,
            filename=file.name,
            status='pending'
        )
        
        # Process document in background
        thread = threading.Thread(
            target=self._process_document_async,
            args=(document.id,)
        )
        thread.start()
        
        serializer = self.get_serializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def _process_document_async(self, document_id):
        """
        Background task to process document.
        
        CHANGES:
        - Uses new chunking method (one article per chunk)
        - Better error handling
        """
        try:
            document = Document.objects.get(id=document_id)
            document.status = 'processing'
            document.save()
            
            # Initialize RAG service (new version)
            rag_service = NepaliRAGService()
            
            # Process document
            # Note: add_to_permanent_kb=False by default
            # Only admin-uploaded docs should set this to True
            result = rag_service.process_document(
                pdf_path=document.file.path,
                document_id=document.id,
                user_id=document.user.id,
                add_to_permanent_kb=False  # Don't add user docs to permanent KB
            )
            
            if result['success']:
                document.status = 'completed'
                document.collection_id = result['collection_id']
                document.num_pages = result['num_pages']
                document.num_chunks = result['num_chunks']
                document.processed_at = timezone.now()
                
                logger.info(f"Document {document_id} processed: {result['num_chunks']} articles, method: {result['parsing_method']}")
            else:
                document.status = 'failed'
                document.error_message = result['error']
            
            document.save()
            
        except Exception as e:
            logger.error(f"Document processing error: {str(e)}")
            try:
                document = Document.objects.get(id=document_id)
                document.status = 'failed'
                document.error_message = str(e)
                document.save()
            except:
                pass

    def destroy(self, request, *args, **kwargs):
        """Delete document record and drop its Chroma collection if it exists."""
        document = self.get_object()
        collection_name = document.collection_id

        response = super().destroy(request, *args, **kwargs)

        if collection_name:
            try:
                rag_service = NepaliRAGService()
                rag_service.chroma_client.delete_collection(name=collection_name)
                logger.info(f"Deleted Chroma collection for document {document.id}: {collection_name}")
            except Exception as e:
                logger.warning(f"Failed to delete Chroma collection {collection_name} for document {document.id}: {e}")

        return response

class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations with RAG support.
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _get_scoped_user_documents(self, conversation):
        """
        Resolve user document scope for retrieval.
        Scope options:
        - conversation: only docs attached to this conversation
        - selected: explicit previous docs chosen by user
        - all_user: all completed docs of this user
        """
        base_qs = Document.objects.filter(
            user=conversation.user,
            status='completed'
        ).exclude(
            collection_id__isnull=True
        ).exclude(
            collection_id=''
        )

        if conversation.retrieval_scope == 'all_user':
            return base_qs.order_by('-created_at')

        if conversation.retrieval_scope == 'selected':
            selected_ids = conversation.selected_document_ids or []
            if not isinstance(selected_ids, list) or not selected_ids:
                return base_qs.none()

            try:
                selected_ids = [int(doc_id) for doc_id in selected_ids]
            except (TypeError, ValueError):
                logger.warning(
                    f"Invalid selected_document_ids on conversation {conversation.id}: {selected_ids}"
                )
                return base_qs.none()

            return base_qs.filter(id__in=selected_ids).order_by('-created_at')

        return base_qs.filter(conversation=conversation).order_by('-created_at')

    def _resolve_search_source(self, conversation):
        """
        Decide retrieval source using strict scope rules:
        - conversation scope: current conversation docs if present, else permanent KB
        - selected scope: only selected docs, else permanent KB
        - all_user scope: all user docs if present, else permanent KB
        """
        documents = self._get_scoped_user_documents(conversation)
        if documents.exists():
            return 'user', documents
        return 'permanent', documents
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a conversation and all its messages.
        """
        conversation = self.get_object()
        logger.info(f"Deleting conversation {conversation.id} for user {request.user.username}")
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """
        Enhanced endpoint with RAG support.
        """
        logger.info(f"add_message called for conversation {pk}")
        
        conversation = self.get_object()
        content = request.data.get('content', '')
        use_rag = request.data.get('use_rag', True)  # Enable RAG by default
        
        # Auto-detect search source based on conversation retrieval scope
        if 'search_source' in request.data:
            # User explicitly specified source
            search_source = request.data.get('search_source')
        else:
            search_source, documents = self._resolve_search_source(conversation)
            logger.info(
                "Auto search source resolved: scope=%s docs=%s source=%s",
                conversation.retrieval_scope,
                documents.count(),
                search_source,
            )
        
        logger.info(f"Using RAG: {use_rag}, Source: {search_source}")
        
        if not content.strip():
            return Response(
                {'error': 'Content cannot be empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add user message
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )

        # Update conversation title to the latest query (ChatGPT-like)
        conversation.title = content[:80]
        
        # Generate AI response
        try:
            if use_rag:
                response_data = self.generate_rag_response(
                    conversation, 
                    content,
                    search_source
                )
                assistant_response = response_data['response']
                sources = response_data.get('sources', [])
            else:
                assistant_response = self.generate_simple_response(content)
                sources = []
        except Exception as e:
            logger.error(f"AI generation failed: {str(e)}")
            assistant_response = "माफ गर्नुहोस्, मलाई अहिले उत्तर दिन समस्या भइरहेको छ। कृपया फेरि प्रयास गर्नुहोस्।"
            sources = []
        
        # Add assistant message
        assistant_message = Message.objects.create(
            conversation=conversation,
            role='assistant',
            parent_message=user_message,
            content=assistant_response,
            sources=sources
        )
        
        # Update conversation timestamp
        conversation.save()
        
        return Response({
            'user_message': MessageSerializer(user_message).data,
            'assistant_message': MessageSerializer(assistant_message).data,
            'sources': sources  # Include source metadata
        })

    def generate_simple_response(self, user_input: str) -> str:
        """Fallback non-RAG response path."""
        return (
            "अहिले RAG बन्द छ, त्यसैले म विस्तृत कानुनी उत्तर दिन सक्दिनँ। "
            "कृपया RAG सक्षम गरेर वा सम्बन्धित दस्तावेज अपलोड गरेर फेरि प्रयास गर्नुहोस्।"
        )
    


    def generate_rag_response(self, conversation, user_input, search_source='permanent'):
        """
        Generate response using RAG with selectable source.
        
        Args:
            conversation: Conversation object
            user_input: User question
            search_source: 'permanent', 'user', or 'all'
        """
        from groq import Groq
        from django.conf import settings
        
        # Initialize RAG service
        rag_service = NepaliRAGService()
        
        # Resolve documents according to conversation retrieval scope.
        documents = self._get_scoped_user_documents(conversation)
        
        # Decide retrieval strategy
        all_context_chunks = []
        
        def _priority_relevance(chunk, source_priority):
            """
            Score helper that keeps relevance as primary factor, but gives a small
            tie-break preference to user-document chunks when both sources are searched.
            """
            base = float(chunk.get('relevance_score') or 0.0)
            return base + source_priority
        
        # 1. Retrieve from User Documents if requested (only current conversation)
        if search_source in ['user', 'all']:
            if documents.exists():
                logger.info(
                    f"Retrieving from {documents.count()} user documents "
                    f"(scope={conversation.retrieval_scope})"
                )
                for doc in documents:
                    if doc.collection_id:
                        chunks = rag_service.retrieve_context(
                            query=user_input,
                            collection_name=doc.collection_id,
                            top_k=3,
                            use_permanent_kb=False
                        )
                        for chunk in chunks:
                            chunk['_combined_score'] = _priority_relevance(chunk, 0.03)
                        all_context_chunks.extend(chunks)
            else:
                logger.warning(
                    f"User search requested but no documents found for scope={conversation.retrieval_scope}"
                )
        
        # 2. Retrieve from Permanent KB if requested
        if search_source in ['permanent', 'all']:
            logger.info("Retrieving from Permanent KB")
            kb_chunks = rag_service.retrieve_context(
                query=user_input,
                collection_name=None,
                top_k=5,
                use_permanent_kb=True
            )
            for chunk in kb_chunks:
                chunk['_combined_score'] = _priority_relevance(chunk, 0.0)
            all_context_chunks.extend(kb_chunks)
            
        # Sort by combined score and take top 5
        all_context_chunks.sort(
            key=lambda x: (
                x.get('_combined_score', float(x.get('relevance_score') or 0.0)),
                float(x.get('relevance_score') or 0.0),
            ),
            reverse=True,
        )
        top_chunks = all_context_chunks[:5]
            
        if not top_chunks:
            msg = """मलाई तपाईंको प्रश्नको उत्तर दिन पर्याप्त जानकारी छैन। 

    कृपया कानुनी दस्तावेज अपलोड गर्नुहोस् वा अधिक विशिष्ट प्रश्न सोध्नुहोस्।

    (I don't have enough information to answer your question. Please upload a legal document or ask a more specific question.)"""
            return {
                'response': msg,
                'sources': {}
            }
        
        # Build detailed source metadata for frontend citation chips
        source_counts = {}
        source_files = []  # Backwards-compatible aggregate for existing UI
        citation_entries = []  # Rich per-chunk metadata (chapter/article/preview)
        seen_files = set()
        for i, chunk in enumerate(top_chunks):
            source = chunk.get('source', 'unknown')
            meta = chunk.get('metadata', {})

            file_name = (
                meta.get('source_file')
                or meta.get('filename')
                or meta.get('original_filename')
                or meta.get('source')
                or 'Unknown file'
            )

            chapter = meta.get('chapter') or meta.get('section')
            dafa = meta.get('dafa') or meta.get('article') or meta.get('section_number')
            upa_dafa = meta.get('upa_dafa') or meta.get('clause')
            hierarchical_title = meta.get('hierarchical_title')
            page_number = meta.get('page') or meta.get('page_start') or meta.get('page_number')

            source_counts[source] = source_counts.get(source, 0) + 1

            key = f"{source}:{file_name}"
            if key not in seen_files:
                seen_files.add(key)
                source_files.append({
                    'source': source,
                    'file': file_name,
                })

            citation_entries.append({
                'id': chunk.get('id'),
                'source': source,
                'file': file_name,
                'chapter': chapter,
                'article': dafa,
                'clause': upa_dafa,
                'page': page_number,
                'title': hierarchical_title,
                'relevance_score': chunk.get('relevance_score'),
                'preview': chunk.get('text', '')
            })

            # Log detailed context for observability
            print(f"=== Chunk {i+1} [{source}] - {file_name} ===")
            print(f"{chunk.get('text', '')[:300]}...")
            print("================================\n")
            
        print(f"Context sources: {source_counts}")
        
        # Format RAG prompt
        prompt = rag_service.format_rag_prompt(user_input, top_chunks)
        
        # Generate response using LLM
        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "तपाईं एक नेपाली कानुनी सहायक हुनुहुन्छ। दिइएको सन्दर्भको आधारमा मात्र नेपालीमा उत्तर दिनुहोस्।"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=800,
            )
            
            # Store response to return with sources
            return {
                'response': response.choices[0].message.content,
                'sources': {
                    'files': source_files,
                    'citations': citation_entries
                }
            }
            
        except Exception as e:
            logger.error(f"LLM API error: {str(e)}")
            fallback_response = (
                "LLM response अहिले उपलब्ध छैन (quota exceeded )। "
                "तलका सन्दर्भहरू हेर्नुहोस्, म फेरि उपलब्ध भएपछि पूर्ण उत्तर दिन सक्छु।"
            )
            return {
                'response': fallback_response,
                'sources': {
                    'files': source_files,
                    'citations': citation_entries
                }
            }
        



class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual messages.
    Supports delete and edit operations.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        # Only allow access to messages from user's own conversations
        return Message.objects.filter(conversation__user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a message.
        """
        message = self.get_object()
        logger.info(f"Deleting message {message.id} from conversation {message.conversation.id}")
        return super().destroy(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Edit a user message and regenerate assistant response.
        Only user messages can be edited.
        """
        message = self.get_object()
        
        if message.role != 'user':
            return Response(
                {'error': 'Only user messages can be edited'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response(
                {'error': 'Content cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Editing message {message.id}: '{message.content}' -> '{new_content}'")
        
        # Update the user message
        message.content = new_content
        message.save()
        
        # Remove previous assistant response(s) linked to this user message.
        try:
            paired_assistants = Message.objects.filter(
                conversation=message.conversation,
                role='assistant',
                parent_message=message
            )

            if paired_assistants.exists():
                logger.info(f"Deleting {paired_assistants.count()} linked assistant response(s) for message {message.id}")
                paired_assistants.delete()
            else:
                # Backward compatibility for old records without parent linkage.
                next_user = Message.objects.filter(
                    conversation=message.conversation,
                    role='user',
                    created_at__gt=message.created_at
                ).order_by('created_at').first()

                legacy_assistant_qs = Message.objects.filter(
                    conversation=message.conversation,
                    role='assistant',
                    created_at__gt=message.created_at,
                )
                if next_user:
                    legacy_assistant_qs = legacy_assistant_qs.filter(created_at__lt=next_user.created_at)

                legacy_assistant = legacy_assistant_qs.order_by('created_at').first()
                if legacy_assistant:
                    logger.info(f"Deleting legacy assistant response {legacy_assistant.id}")
                    legacy_assistant.delete()
        except Exception as e:
            logger.warning(f"Could not delete old assistant response: {e}")
        
        # Generate new assistant response using the conversation's RAG logic
        try:
            conversation_viewset = ConversationViewSet()
            conversation_viewset.request = request
            
            # Auto-detect search source using strict scope policy
            search_source, _ = conversation_viewset._resolve_search_source(message.conversation)
            
            response_data = conversation_viewset.generate_rag_response(
                message.conversation,
                new_content,
                search_source
            )
            assistant_content = response_data['response']
            sources_payload = response_data.get('sources', {})
            
            # Create new assistant message linked to edited user message
            assistant_message = Message.objects.create(
                conversation=message.conversation,
                role='assistant',
                parent_message=message,
                content=assistant_content,
                sources=sources_payload
            )
            
            return Response({
                'user_message': MessageSerializer(message).data,
                'assistant_message': MessageSerializer(assistant_message).data,
                'sources': sources_payload
            })
            
        except Exception as e:
            logger.error(f"Failed to generate new response: {str(e)}")
            return Response(
                {'error': f'Failed to generate response: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
