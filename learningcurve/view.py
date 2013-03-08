from datetime import datetime, timedelta
import logging
import os
import sys
import time
import traceback
import cgi

from django.utils import simplejson
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

import learningcurve
from learningcurve import controller, settings




class TemplatedRequestHandler(webapp.RequestHandler):
    """Simplifies handling requests. In particular, it simplifies working
    with templates, with its render() method.

    """

    def handle_exception(self, exception, debug_mode):
        """Called if this handler throws an exception during execution.

        """
        logging.exception(exception)

        # Also show a traceback if debug is enabled, or if the currently logged
        # in Google user is an application administrator.
        if debug_mode or users.is_current_user_admin():
            tb = ''.join(traceback.format_exception(*sys.exc_info()))
        else:
            tb = None

        self.render(settings.ERROR_TEMPLATE, traceback=tb)

    def head(self, *args, **kwargs):
        self.get(*args, **kwargs)

    def initialize(self, request, response):
        super(TemplatedRequestHandler, self).initialize(request, response)

    def not_found(self, template_name=None, **kwargs):
        """Similar to the render() method, but with a 404 HTTP status code.
        Also, the template_name argument is optional. If not specified, the
        NOT_FOUND_TEMPLATE setting will be used instead.

        """
        if not template_name:
            template_name = settings.NOT_FOUND_TEMPLATE
        self.response.set_status(404)
        self.render(template_name, **kwargs)

    def render(self, template_name, **kwargs):
        """Renders the specified template to the output.

        The template will have the following variables available, in addition
        to the ones specified in the render() method:
        - settings: Access to the application settings.
        - request: The current request object. Has attributes such as 'path',
                   'query_string', etc.

        """
        kwargs.update({'request': self.request,
                       'settings': settings})

        path = os.path.join(settings.TEMPLATE_DIR, template_name)
        self.response.out.write(template.render(path, kwargs))

def _json(data):
    return simplejson.dumps(jsonify(data), separators=(',', ':'))

def jsonify(obj):
    """Takes complex data structures and returns them as data structures that
    simplejson can handle.

    """
    # Return datetimes as a UNIX timestamp (seconds since 1970).
    if isinstance(obj, datetime):
        return int(time.mktime(obj.timetuple()))

    # Return timedeltas as number of seconds.
    if isinstance(obj, timedelta):
        return obj.days * 86400 + obj.seconds + obj.microseconds / 1e6

    # Since strings are iterable, return early for them.
    if isinstance(obj, basestring):
        return obj

    # Handle dicts specifically.
    if isinstance(obj, dict):
        new_obj = {}
        for key, value in obj.iteritems():
            new_obj[key] = jsonify(value)
        return new_obj

    # Walk through iterable objects and return a jsonified list.
    try:
        iterator = iter(obj)
    except TypeError:
        # Return non-iterable objects as they are.
        return obj
    else:
        return [jsonify(item) for item in iterator]

class ApiHandler(TemplatedRequestHandler):
    def get(self, action):
        res = self.response
        attr = getattr(controller, action, None)
        if not attr:
            res.set_status(404)
            res.out.write('{"status":"not_found"}')
            return
        if not getattr(attr, '__public', False):
            res.set_status(403)
            res.out.write('{"status":"forbidden"}')
            return

        req = self.request

        try:
            kwargs = {}
            for arg in req.arguments():
                if arg.startswith('_'): continue
                # kwargs[str(arg)] = simplejson.loads(str(cgi.escape(req.get(arg))))
		if len(req.get_all(arg)) > 1:
		    kwargs[str(arg)] = map(cgi.escape, req.get_all(arg))
		else:
                    kwargs[str(arg)] = str(cgi.escape(req.get(arg)))

            data = attr(self, **kwargs) if callable(attr) else attr
	    if data:
                result = {'status': 'success',
                          'response': jsonify(data)}
	    else:
		result = {'status': 'forbidden'}

        except BaseException, e:
            logging.exception('API error:')

            res.set_status(400)
            result = {'status': 'error',
                      'response': str(e),
                      'module': type(e).__module__,
                      'type': type(e).__name__}

        # Write the response as JSON.
        res.headers['Content-Type'] = 'application/json'
        res.out.write(simplejson.dumps(result, separators=(',', ':')))

    post = get

class AppHandler(TemplatedRequestHandler):
    def get(self):
	login = users.create_login_url('/')
	user = users.get_current_user()
	role = str( users.is_current_user_admin() ).lower()
	user_email = user.email() if user else None
        self.render("index.html", title = "Learning Curve",
		                  static_dir = "/static",
				  login_url = login,
				  user = user_email,
				  role = role)
        return

class NotFoundHandler(TemplatedRequestHandler):
    def get(self):
        self.not_found()
    post = get


