"""Django settings for backend project."""

import os
from pathlib import Path

from dotenv import load_dotenv


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str = "") -> list[str]:
    raw_value = os.getenv(name, default)
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-local-dev-only")

DEBUG = _env_bool("DEBUG", True)

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
        # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',  # For token authentication
    'corsheaders',  # For handling CORS
    
    # Your apps
    'chat',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this line
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

if _env_bool('USE_WHITENOISE', False):
    MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'







# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

if _env_bool('USE_WHITENOISE', False):
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'



# Media files configuration for PDF uploads
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ChromaDB configuration
CHROMADB_PATH = Path(os.getenv('CHROMADB_PATH', BASE_DIR / 'chromadb_data'))

CSRF_TRUSTED_ORIGINS = _env_list('CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')

# CORS settings
CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')

CORS_ALLOW_CREDENTIALS = True

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}


# Later in the file, add:
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
LLAMAPARSE_API_KEY = os.getenv('LLAMAPARSE_API_KEY', '')


if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', True)
    SECURE_HSTS_PRELOAD = _env_bool('SECURE_HSTS_PRELOAD', True)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'