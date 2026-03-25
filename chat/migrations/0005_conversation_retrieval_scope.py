from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0004_message_sources'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversation',
            name='retrieval_scope',
            field=models.CharField(
                choices=[
                    ('conversation', 'Current Conversation Documents'),
                    ('selected', 'Selected Previous Documents'),
                    ('all_user', 'All My Documents'),
                ],
                default='conversation',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='conversation',
            name='selected_document_ids',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
