
from google.appengine.ext import webapp

from learningcurve import settings

register = webapp.template.create_template_register()

@register.filter
def static(path):
    """Modifies a path by prepending the absolute path to where static files
    reside and adding a version-specific hash to the end of the path to make
    the path unique for the currently deployed version.

    The path should always be relative to the static path.

    """
    return '/s/%(version)s/%(path)s' % {
        'path': path,
        'version': settings.VERSION_HASH}
