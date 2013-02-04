import logging
import os
import wsgiref.handlers

from google.appengine.dist import use_library

# Use Django 1.1 instead of Django 0.96. This code must run before the GAE web
# framework is loaded.
use_library('django', '1.1')

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template, util

import learningcurve.settings
import learningcurve.urls

# Register custom Django template filters/tags.
template.register_template_library('learningcurve.template_extensions')

def main():
    application = webapp.WSGIApplication(
        learningcurve.urls.urlpatterns,
        debug=learningcurve.settings.DEBUG)

    # Run the WSGI CGI handler with the application.
    util.run_wsgi_app(application)

if __name__ == '__main__':
    main()
