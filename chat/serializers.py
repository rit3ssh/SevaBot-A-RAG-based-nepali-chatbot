from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message, Document


def build_ordered_messages(conversation: Conversation):
    """Return messages in stable query->assistant order using explicit parent linkage."""
    all_messages = list(conversation.messages.all().order_by('created_at', 'id'))

    users = [message for message in all_messages if message.role == 'user']
    assistants_by_parent = {}

    for message in all_messages:
        if message.role == 'assistant' and message.parent_message_id:
            assistants_by_parent.setdefault(message.parent_message_id, []).append(message)

    ordered = []
    used_ids = set()

    for user_message in users:
        ordered.append(user_message)
        used_ids.add(user_message.id)

        paired_replies = assistants_by_parent.get(user_message.id, [])
        paired_replies.sort(key=lambda item: (item.created_at, item.id))
        for reply in paired_replies:
            if reply.id not in used_ids:
                ordered.append(reply)
                used_ids.add(reply.id)

    # Append remaining legacy/unpaired messages in chronological order.
    for message in all_messages:
        if message.id not in used_ids:
            ordered.append(message)

    return ordered


def build_recent_exchange(conversation: Conversation):
    """Return the most recent user query and its assistant reply with timestamps."""
    last_user = conversation.messages.filter(role='user').order_by('-created_at').first()
    if not last_user:
        last_assistant = conversation.messages.filter(role='assistant').order_by('-created_at').first()
        if not last_assistant:
            return None
        return {
            'query': None,
            'query_time': None,
            'answer': last_assistant.content,
            'answer_time': last_assistant.created_at.isoformat(),
        }

    last_assistant = conversation.messages.filter(
        role='assistant',
        parent_message=last_user
    ).order_by('-created_at').first()

    if not last_assistant:
        # Backward compatibility for old messages without parent linkage.
        last_assistant = conversation.messages.filter(
            role='assistant',
            created_at__gte=last_user.created_at
        ).order_by('created_at').first()

    if not last_user and not last_assistant:
        return None

    return {
        'query': last_user.content if last_user else None,
        'query_time': last_user.created_at.isoformat() if last_user else None,
        'answer': last_assistant.content if last_assistant else None,
        'answer_time': last_assistant.created_at.isoformat() if last_assistant else None,
    }

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    We use write_only for password so it's never returned in API responses.
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        # Use create_user to properly hash passwords
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for individual messages.
    Simple pass-through of model fields.
    """
    class Meta:
        model = Message
        fields = ['id', 'role', 'parent_message', 'content', 'sources', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """
    Serializer for conversations.
    Includes nested messages and message count.
    """
    messages = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    recent_exchange = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'title',
            'retrieval_scope',
            'selected_document_ids',
            'created_at',
            'updated_at',
            'messages',
            'message_count',
            'recent_exchange',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_selected_document_ids(self, value):
        request = self.context.get('request')
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('selected_document_ids must be a list of document IDs.')

        normalized_ids = []
        for item in value:
            try:
                normalized_ids.append(int(item))
            except (TypeError, ValueError):
                raise serializers.ValidationError('selected_document_ids must contain only integer IDs.')

        deduped_ids = list(dict.fromkeys(normalized_ids))

        if request and deduped_ids:
            allowed_ids = set(
                Document.objects.filter(user=request.user, id__in=deduped_ids).values_list('id', flat=True)
            )
            unauthorized_ids = [doc_id for doc_id in deduped_ids if doc_id not in allowed_ids]
            if unauthorized_ids:
                raise serializers.ValidationError(
                    f'Invalid document IDs for current user: {unauthorized_ids}'
                )

        return deduped_ids

    def validate(self, attrs):
        retrieval_scope = attrs.get(
            'retrieval_scope',
            getattr(self.instance, 'retrieval_scope', 'conversation')
        )
        selected_ids = attrs.get(
            'selected_document_ids',
            getattr(self.instance, 'selected_document_ids', [])
        )

        if retrieval_scope != 'selected':
            attrs['selected_document_ids'] = []
        elif not selected_ids:
            raise serializers.ValidationError({
                'selected_document_ids': 'Choose at least one document when retrieval_scope is selected.'
            })

        return attrs

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_messages(self, obj):
        ordered_messages = build_ordered_messages(obj)
        return MessageSerializer(ordered_messages, many=True, context=self.context).data

    def get_recent_exchange(self, obj):
        return build_recent_exchange(obj)


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing conversations in sidebar.
    We don't include full messages here for performance.
    """
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    chat_started_at = serializers.SerializerMethodField()
    last_interacted_at = serializers.SerializerMethodField()
    recent_exchange = serializers.SerializerMethodField()
    selected_document_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'title',
            'retrieval_scope',
            'selected_document_ids',
            'selected_document_count',
            'created_at',
            'updated_at',
            'chat_started_at',
            'last_interacted_at',
            'message_count',
            'last_message',
            'recent_exchange'
        ]

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'role': last_msg.role,
                'content': last_msg.content[:50] + '...' if len(last_msg.content) > 50 else last_msg.content
            }
        return None

    def get_chat_started_at(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M') if obj.created_at else None

    def get_last_interacted_at(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M') if obj.updated_at else None

    def get_recent_exchange(self, obj):
        return build_recent_exchange(obj)

    def get_selected_document_count(self, obj):
        if obj.retrieval_scope != 'selected':
            return 0
        selected_ids = obj.selected_document_ids or []
        return len(selected_ids)



class DocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for uploaded PDF documents.
    """
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'filename', 'status', 'num_pages', 'num_chunks',
            'error_message', 'created_at', 'processed_at', 'file_url'
        ]
        read_only_fields = [
            'id', 'status', 'num_pages', 'num_chunks', 
            'error_message', 'created_at', 'processed_at'
        ]
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None