from datetime import datetime
import logging
import re
import string
import uuid

from google.appengine.ext import db
from google.appengine.api.datastore import Key

import learningcurve
from learningcurve import settings

def get_key(value, kind=None, parent=None, encoded=True):

    if encoded:
	return db.Key(value)
    
    if not isinstance(kind, basestring):
        if issubclass(kind, db.Model):
            kind = kind.kind()
        else:
            raise TypeError(
                'Invalid type (kind); should be a Model subclass or a string.')

    if isinstance(value, db.Key):
        assert value.kind() == kind, 'Tried to use a Key of the wrong kind.'
        assert value.parent() == parent, 'Invalid Key parent.'
        return value
    elif isinstance(value, db.Model):
        assert value.kind() == kind, 'Tried to use a Model of the wrong kind.'
        assert value.parent_key() == parent, 'Invalid Model parent.'
        return value.key()

    if isinstance(value, (basestring, int, long)):
        return db.Key.from_path(kind, value, parent=parent)
    else:
        raise TypeError('Invalid type (value); expected string, number, Key '
                        'or %s.' % kind)

def get_instance(value, model, parent=None):
    if not issubclass(model, db.Model):
        raise TypeError('Invalid type (model); expected subclass of Model.')

    if isinstance(value, basestring):
        return model.get_by_key_name(value, parent=parent)
    elif isinstance(value, (int, long)):
        return model.get_by_id(value, parent=parent)
    elif isinstance(value, db.Key):
        return db.get(value)
    elif isinstance(value, model):
        return value
    else:
        raise TypeError('Invalid type (value); expected string, number, Key '
                        'or %s.' % model.__name__)


def _create_resource(title,link,note,topic_key,type='document'):
    resource = Resource(
	        title = title,
		link = link,
		note = note,
		type = type,
		topic = topic_key)

    resource.put()
    
    return resource


def _create_topic(name, description, parent_topic=None):
    if len(description) < 10:
        raise ValueError('Description is too short.')
    if len(description) > 450:
        raise ValueError('Description is too long.')
    
    description = re.sub(r'\s+', ' ', description).strip()
    if parent_topic:
        parent_topic.size = parent_topic.size + 1
	keyname = str( parent_topic.key().id_or_name() ) \
		        + "." + str(parent_topic.size)
        topic = Topic(
	        name = name,
		description = description,
		key_name = keyname)
        topic.put()
        parent_topic.put()
    else:
	counter_key = get_key(value="Topic", \
	    kind="Counter", encoded=False)
	counter = get_instance(counter_key, Counter)
	if not counter:
	    counter = Counter( key_name = "Topic" )

	counter.num = counter.num + 1
        topic = Topic(
	        name = name,
		description = description,
		key_name = str(counter.num) )

        topic.put()
	counter.put()

    return topic

def _get_topics(topic = None):
    q = db.Query(Topic)
    if topic:
	if isinstance(topic, basestring):
	    topic_key = get_key(topic_id, "Topic")	
	    key_name_start = str( topic_key.id_or_name() )
	    key_name__end = key_start + "Z"
	elif isinstance(topic, Topic):
	    key_name_start = str( topic.key().id_or_name() )
	    keyname__end = key_start + "Z"
        
	key_start = get_key(key_name_start, kind='Topic', encoded=False)
	key_end = get_key(key_name_end, kind='Topic', encoded=False)

        q.filter('__key__ >=', key_start)
        q.filter('__key__ <', key_end)

    q.order('__key__')

    return q.fetch(settings.FETCH_THEM_ALL)


def _get_resources(topic_keys):
    if not topic_keys:
	return
    q = db.Query(Resource)
    if isinstance(topic_keys, db.Key):
        q.filter('topic =', topic_keys)
    elif isinstance(topic_keys, list):
	q.filter('topic IN', topic_keys)
    else:
	return 

    return q.fetch(settings.FETCH_THEM_ALL)
    

# Model Classes

class Counter(db.Model):
    num = db.IntegerProperty(default=0)


class Topic(db.Model):
    created = db.DateTimeProperty(auto_now_add=True)
    name = db.StringProperty(required=True)
    description = db.StringProperty(indexed=False, required=True)
    size = db.IntegerProperty(default=0)

    def to_dict(self):

	return {
		"name"       :  self.name,
		"description":  self.description,
		"id"         :  self.key().__str__(),
		"subtopics"  :  []
	       }

class Resource(db.Model):
    created = db.DateTimeProperty(auto_now_add=True)
    note = db.TextProperty(indexed=False, required=True)
    title = db.StringProperty(required=True)
    type = db.StringProperty(default="tutorial")
    link = db.LinkProperty(required=True)
    topic = db.ReferenceProperty(required=True)

    def to_dict(self):
	return {
		    "title" : self.title, 
		    "link"  : self.link, 
		    "type"  : self.type, 
		    "note"  : self.note, 
		 "created"  : self.created.strftime("%Y-%m-%d"), 
		      "id"  : self.key().__str__(),
		  "topic_id": self.topic.key().__str__() 
	        }
