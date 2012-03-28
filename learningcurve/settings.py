
from datetime import timedelta
import hashlib
import os

DOMAIN = 'www.example.com'
TEMPLATE_DIR = 'templates'

ERROR_TEMPLATE = '500.html'
NOT_FOUND_TEMPLATE = '404.html'

ANALYTICS_TRACKER_ID = ''

PAGE_SIZE = 20

VERSION = os.environ['CURRENT_VERSION_ID']

VERSION_HASH = hashlib.md5(VERSION).hexdigest()[:5]

DEBUG = os.environ['SERVER_SOFTWARE'].startswith('Development')

FETCH_THEM_ALL = 65535

ADMIN_USERS = ["shengyiran@gmail.com", "hyenagrins@gmail.com"]
