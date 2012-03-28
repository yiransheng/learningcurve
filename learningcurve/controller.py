
from datetime import datetime, timedelta
import os

from google.appengine.api import memcache

import learningcurve
from learningcurve import models,settings
from learningcurve.utils import public, auth


def _update_cached_tree(topic, parent_key_name = None):
    data = memcache.get("data")
    if not data:
	return False
    else: 
	parent = data["root"]
	location = data["location"]

    if parent_key_name:
	parent_loc = location[parent_key_name]
        parent = _topic_lookup(parent,parent_loc)    
    else:
	parent_loc = []
    
    location[topic.key().name()] = parent_loc + [len(parent["subtopics"])]
    parent["subtopics"].append( topic.to_dict() )

    data = {"root" : data["root"], "location" : location }
    memcache.set("data", data)

    return True

@auth
def update(handler, obj_id, **kwargs):
    obj_key = models.get_key(obj_id)
    if obj_key.kind() == "Topic":
	topic = models.db.get(obj_key)
	topic.name = kwargs["name"]
	topic.description = kwargs["description"]
	topic.put()
	return { "updated":obj_id, "type": "Topic" }

    elif obj_key.kind() == "Resource":
        resource = models.db.get(obj_key)
        resource.title = kwargs["title"]
        resource.note = kwargs["note"]
        resource.link = kwargs["link"]
        resource.type = kwargs["type"]
	resource.topic = models.get_key(kwargs["topic_id"])
	resource.put()
	return { "updated":obj_id, "type":"Resource" }

    else: 
	return {"updated":""}

@auth
def delete(handler, obj_id):
    obj_key = models.get_key(obj_id)
    if obj_key.kind() == "Topic":
	topic = models.db.get(obj_key)
        topics = models._get_topics(topic) 
	for t in topics:
	    t.delete()

        memecache.set("data", None)	
	return {"deleted":obj_id}
    elif obj_key.kind() == "Resource":
        resource = models.Resource.get(obj_key)
	resource.delete()
	return {"deleted":obj_id}
    else: 
	return {"deleted":""}

@auth
def create_topic(handler, name, description, parent_id=None):
    if not parent_id:
        raise ValueError("Parent topic is required.")
    else:
        parent_key = models.get_key(parent_id)	
	parent = models.Topic.get(parent_key)
    
    topic = models._create_topic(name, description, parent)
    _update_cached_tree(topic, parent_key.name())

    return { "topic_id" : topic.key().__str__() }

@auth
def create_subject(handler, name, description):
    # handlers root level topic differently
    topic = models._create_topic(name, description)
    _update_cached_tree(topic)

    topic_id = topic.key().__str__()
    return { "subject_id" : topic_id }


@auth
def create_resource(handler,title,link,note,parent_id=None,type='webpage'):
    topic_key = models.get_key(parent_id, "Topic") if parent_id else models.get_key("Bookmark", kind="Topic", encoded=False)	
    resource = models._create_resource(title,link,note,topic_key,type)

    return { "resource_id" : resource.key().__str__() }

@public
def load_resources(handler, topic_ids):
    if not isinstance(topic_ids, list):
	topic_keys = models.get_key(topic_ids)
    else: 
	topic_keys = map(models.get_key, topic_ids)
    resources = models._get_resources(topic_keys)
    resources = [r.to_dict() for r in resources]
    
    return { "resources" : resources }

@public
def load_bookmarks(handler):
    bookmarks = models._get_bookmarks()
    bookmarks = [r.to_dict() for r in bookmarks]

    return { "bookmarks" : bookmarks }

@public
def get_topic_tree(handler, topic_id=None):

    data = memcache.get("data2")
    if data:
        output = data["root"]
        location = data["location"]
	if not topic_id:
            return output
	elif location:
	    locs = location[models.get_key(topic_id).name()] 
	    return _topic_lookup(output, locs)
	    

    location = {}
    output = { 
	       "name"        : "ROOT",
	       "description" : "",
	       "subtopics"   : []
	     }
    topics = models._get_topics()
    for topic in topics:
	topic_dict = topic.to_dict()
        locstr = topic.key().name() 
	if (locstr == "Bookmark"):
            continue
        loc_nodes = locstr.split(".")
	parent_locstr = ".".join(loc_nodes[0:len(loc_nodes)-1])
	if parent_locstr:
	    parent = _topic_lookup(output, location[parent_locstr])
	    location[locstr] = location[parent_locstr] + [len(parent["subtopics"])]
	    parent["subtopics"].append(topic_dict)
	else:
	    location[locstr] = [ len(output["subtopics"]) ]
	    output["subtopics"].append(topic_dict)

    if not topic_id:
	data = {"root" : output, "location" : location }
        memcache.set("data", data)
        return output
    else:
	locs = location[models.get_key(topic_id).name()] 
	return _topic_lookup(output, locs)

def _topic_lookup(topic_dict, locs):

    target = topic_dict

    for l in locs:
        
	if target["subtopics"]:
	    target = target["subtopics"][l] 
	else:
	    return target

    return target

	    
	



