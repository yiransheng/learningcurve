
import time

from google.appengine.api import users
from learningcurve import settings

def _get_value(obj, name):
    try:
        value = getattr(obj, name)
    except AttributeError:
        try:
            # If the attribute doesn't exist, attempt to use the object as a dict.
            value = obj[name]
        except:
            # Failing that, just return None.
            return None
    # If the value is callable, call it and use its return value.
    return value() if callable(value) else value

def get_dict(obj, attributes):
    result = dict()
    for attr in attributes:
        if isinstance(attr, basestring):
            alias = None
        else:
            # If a value in the attributes list is not a string, it should be
            # two packed values: the attribute name and the key name it should
            # have in the dict.
            attr, alias = attr

        # Since the obj variable is needed for future iterations, its value is
        # stored in a new variable that can be manipulated.
        value = obj

        if '.' in attr:
            # Dots in the attribute name can be used to fetch values deeper
            # into the object structure.
            for sub_attr in attr.split('.'):
                value = _get_value(value, sub_attr)
            if not alias:
                alias = sub_attr
        else:
            value = _get_value(value, attr)

        # Store the value in the dict.
        result[alias if alias else attr] = value

    return result

def public(func):
    func.__public = True
    return func

def set_cookie(handler, name, value, expires=None, path='/'):
    # Build cookie data.
    if expires:
        ts = time.strftime('%a, %d-%b-%Y %H:%M:%S GMT', expires.timetuple())
        cookie = '%s=%s; expires=%s; path=%s' % (name, value, ts, path)
    else:
        cookie = '%s=%s; path=%s' % (name, value, path)

    # Send cookie to browser.
    handler.response.headers['Set-Cookie'] = cookie
    handler.request.cookies[name] = value

def auth(f):
    def admin_check(*args,**kwargs):
        def forbid():
	    return None
	def is_admin(user):
	    return user.email() in settings.ADMIN_USERS	
	if users.is_current_user_admin():
	    return f(*args,**kwargs)
	if users.get_current_user() and is_admin(users.get_current_user()):	    
	    return f(*args,**kwargs)
	
	return forbid()
     
    admin_check.__public = True
    return admin_check

