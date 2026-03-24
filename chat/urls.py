# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import ConversationViewSet, signup, login, logout

# # Router automatically generates URLs for ViewSet
# router = DefaultRouter()
# router.register(r'conversations', ConversationViewSet, basename='conversation')

# urlpatterns = [
#     path('auth/signup/', signup, name='signup'),
#     path('auth/login/', login, name='login'),
#     path('auth/logout/', logout, name='logout'),
#     path('', include(router.urls)),
# ]



from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConversationViewSet, DocumentViewSet, MessageViewSet, 
    signup, login, logout, profile, change_password
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('auth/signup/', signup, name='signup'),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/profile/', profile, name='profile'),
    path('auth/change-password/', change_password, name='change-password'),
    path('', include(router.urls)),
]