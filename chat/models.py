# from django.db import models
# from django.contrib.auth.models import User

# class Conversation(models.Model):
#     """
#     Represents a chat conversation/thread.
#     Each user can have multiple conversations.
#     """
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
#     title = models.CharField(max_length=255, default="New Chat")
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         ordering = ['-updated_at']  # Most recent first

#     def __str__(self):
#         return f"{self.user.username} - {self.title}"


# class Message(models.Model):
#     """
#     Individual messages within a conversation.
#     Each message belongs to one conversation and has a role (user/assistant).
#     """
#     ROLE_CHOICES = [
#         ('user', 'User'),
#         ('assistant', 'Assistant'),
#     ]
    
#     conversation = models.ForeignKey(
#         Conversation, 
#         on_delete=models.CASCADE, 
#         related_name='messages'
#     )
#     role = models.CharField(max_length=10, choices=ROLE_CHOICES)
#     content = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         ordering = ['created_at']  # Chronological order

#     def __str__(self):
#         return f"{self.role}: {self.content[:50]}"






from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_delete
from django.dispatch import receiver

class Conversation(models.Model):
    """
    Represents a chat conversation/thread.
    Each user can have multiple conversations.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=255, default="New Chat")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Message(models.Model):
    """
    Individual messages within a conversation.
    Each message belongs to one conversation and has a role (user/assistant).
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='child_replies',
        null=True,
        blank=True
    )
    content = models.TextField()
    sources = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class Document(models.Model):
    """
    Represents an uploaded PDF document.
    Tracks processing status and metadata.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='documents',
        null=True,
        blank=True
    )
    file = models.FileField(upload_to='pdfs/')
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Processing metadata
    num_pages = models.IntegerField(null=True, blank=True)
    num_chunks = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    # ChromaDB collection ID for this document
    collection_id = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)



    parser_used = models.CharField(
        max_length=50, 
        null=True, 
        blank=True,
        choices=[
            ('llamaparse', 'LlamaParse (Modern)'),
            ('nepali_legal_chunker', 'Nepali Legal Chunker (Preeti)')
        ]
    )
    pdf_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ('modern', 'Modern Unicode'),
            ('preeti', 'Preeti/Legacy Font')
        ]
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.filename} - {self.status}"


@receiver(post_delete, sender=Document)
def delete_document_file_on_row_delete(sender, instance, **kwargs):
    """Remove uploaded file from storage when its Document row is deleted."""
    if not instance.file:
        return

    file_name = instance.file.name
    if not file_name:
        return

    # Guard in case multiple rows reference the same file path.
    is_referenced_elsewhere = Document.objects.filter(file=file_name).exists()
    if is_referenced_elsewhere:
        return

    instance.file.delete(save=False)


class Profile(models.Model):
    """
    Extended user profile for storing app-specific settings.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    llm_api_key = models.CharField(max_length=255, null=True, blank=True)
    
    def __str__(self):
        return f"Profile for {self.user.username}"

@receiver(models.signals.post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a profile when a new user is created."""
    if created:
        Profile.objects.create(user=instance)

@receiver(models.signals.post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure profile stays in sync with user."""
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        Profile.objects.create(user=instance)