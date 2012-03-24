# -*- coding: utf-8 -*-
#
# Copyright © 2010 Andreas Blixt
#
# This file is part of Storyteller.
#
# Storyteller is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option)
# any later version.
#
# Storyteller is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
# details.
#
# You should have received a copy of the GNU General Public License along with
# Storyteller. If not, see http://www.gnu.org/licenses/.
#

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
