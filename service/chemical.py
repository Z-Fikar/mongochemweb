#******************************************************************************
#
#  This source file is part of the OpenChemistry project.
#
#  Copyright 2013 Kitware, Inc.
#
#  This source code is released under the New BSD License, (the "License").
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#
#******************************************************************************/

#
# Tangelo service to provide RESTful API to a mongochem database.
#
# Two URL formats are supported.
#
# Basic - This is design to allow user to easily construct a user to a particular
#         molecule.
#
#         GET /chemical/<field>/<value>/<output>?limit=<limit>
#
#
# Where field is one of:
#   name
#   formula
#   inchi
#   inchikey
#
# and output is the desired output format:
#   png        - The diagram as a png
#   svg        - The diagram as a svg
#   cjson      - The molecule or molecules cjson.
#   inchi      - The inchi string.
#   inchikey   - The inchi key.
#   count      - The count of the number of records matching the query.
#
# The value can contain * as wildcard.
#
# An extract query parameter can be added to limit the number of records return.
#
# For example:
#
#    GET /chemical/inchikey/KVJWZTLXIROHIL-UHFFFAOYSA-N/svg
#
# will return the svg for the given inchikey.
#
# Advance - This allow more flexibility in terms of querying record, simple
#           queries can be constructed using a basic query language.
#
#           GET /chemical/<output?q=<query>&limit=<limit>
#
# Where output is the same as the option listed above. The query parameter is
# query the conforms to the following syntax:
#
# There are six comparison operators:
#
#   ~eq~   - string or numeric equals in the case of string equals * can be used
#           as a wildcard.
#   ~ne~   - string or numeric not equals.
#   ~gt~   - numeric greater than, has not meaning for strings.
#   ~gte~  - numeric greater or equal than, has not meaning for strings.
#   ~lt~   - numeric less than, has not meaning for strings.
#   ~lte~  - numeric less or equal than, has not meaning for strings.
#
# The comparison operators can be using with the follow string fields:
#   inchi
#   inchikey
#   name
#   formula
#
# or the following numeric fields:
#
#   mass
#   atomCount
#
# The comparison operators can be combine using the following two boolean
# operator, precedence is left to right:
#
#   ~or~   - logical OR
#   ~and~  = logical AND
#
# Example:
#
#   GET /chemical/count?mass~eq~100   - Will return as count of all the
#   the molecules with mass equal to 100.
#
import cherrypy
import pymongo
import tangelo
import json
import re
import bson.json_util
import shlex
import os

# add query parser module to path
tangelo.paths(['../query'])

import query

structure_search_keys = ['name', 'formula', 'inchi', 'inchikey', 'mass', 'atomCount']
representations = ['png', 'svg', 'cjson', 'inchi', 'inchikey', 'count']

# the mime types for the return representations
mime_types = {'png': 'image/png',
              'svg': 'image/svg+xml',
              'cjson': 'application/json',
              'inchi': 'text/plain',
              'inchikey': 'text/plain',
              'count': 'text/plain' }

default_limit = 50

# load the configuration
config = {}
path = os.path.dirname(os.path.realpath(__file__))
with open ('%s/../config/db.json' % (path)) as fp:
  config = json.load(fp)

# connect to a particular mongochem instance
client = None
def connect(server, db):
  if not client:
    global client
    client = pymongo.Connection(server)[db]['molecules']

  return client

# convert wildcards to regex
def wildcard_to_regex(value):
  value = value.replace('*', '.*')

  return re.compile('^%s$' % value)

# generate a project for a given output representation
def generate_mongo_projection(rep):
  proj = {'id_': 1}

  if rep == 'png':
    proj = {'diagram': 1}
  elif rep in ['svg', 'inchi', 'inchikey']:
    proj = {rep: 1}
  elif rep == 'cjson':
    proj = { 'name': 1, 'inchi': 1, 'formula': 1, 'atoms': 1, 'bonds': 1,
            'properties': 1, 'mass': 1 }

  return proj

# iterate through the result set
def process_cursor(cursor, trans):
  response = ""
  for mol in cursor:
    response += "%s\n" % trans(mol)

  return response

def process_cursor_to_list(cursor, trans):
  response = []
  for mol in cursor:
    response.append(trans(mol))

  return response

# transform the result set from mongo into a HTTP response
def result_to_response(rep, cursor):

  tangelo.content_type(mime_types[rep])

  if rep ==  'png':
    cursor.limit(1)
    return process_cursor(cursor, lambda mol: mol['diagram'])
  elif rep == 'svg':
    cursor.limit(1)

    def process_svg(mol):
      svg = ''
      if 'svg' in mol:
        svg = mol['svg']

      return svg

    svg = process_cursor(cursor, process_svg)

    if len(svg.strip()) == 0:
      svg = '<?xml version="1.0"?><svg version="1.1" id="topsvg" \
             xmlns="http://www.w3.org/2000/svg" \
             xmlns:xlink="http://www.w3.org/1999/xlink" \
             xmlns:cml="http://www.xml-cml.org/schema" \
             x="0" y="0" width="0px" height="0px" viewBox="0 0 0 0"></svg>'

      tangelo.log(svg);


    return svg

  elif rep == 'cjson':
    def to_cjson(mol):
      mol['chemical json'] = 0
      del mol['_id']
      return mol
    result = {}
    result['results'] = process_cursor_to_list(cursor, to_cjson)
    return result
  elif rep == 'inchi':
    return process_cursor(cursor, lambda mol: mol['inchi'])
  elif rep == 'inchikey':
    return process_cursor(cursor, lambda mol: mol['inchikey'])
  elif rep == 'count':
    count = cursor.count()
    return count

  return ""

def generate_mongo_query(key, value):
  if '*' in value:
    value = wildcard_to_regex(value)

  return {key: value}

# execute mongo query
def execute_query(find, proj, rep, limit):
  retry_count = 10

  while(retry_count>0):
    try:
      coll = connect(config['server'], config['db'])

      tangelo.log(str(find))

      cursor =  coll.find(find, proj)
      cursor.limit(limit)

      return result_to_response(rep, cursor)
    except pymongo.errors.AutoReconnect:
      retry_count -= 1

  return tangelo.HTTPStatusCode(500, 'Unable to connect to mongochem')

# get the limit from the named parameters or use the default
def getlimit(kwargs):
  if 'limit' in kwargs:
    limit = int(kwargs['limit'])
  else:
    limit = default_limit

  return limit

# process a basic query request
def basic_query(args, kwargs):

  if len(args) != 3:
    raise cherrypy.HTTPError(400)

  if not args[0] in structure_search_keys:
    raise cherrypy.HTTPError(400, "Unsupported query key")

  if not args[2] in representations:
    raise cherrypy.HTTPError(400, "Unsupported representation")

  key = args[0]
  value = args[1]
  rep = args[2]

  limit  = getlimit(kwargs)

  mongo_query = generate_mongo_query(key, value)
  proj = generate_mongo_projection(rep)

  return execute_query(mongo_query, proj, rep, limit)

# process an advance query
def advanced_query(args, kwargs):
  if len(args) != 1 or 'q' not in kwargs:
    raise cherrypy.HTTPError(400)

  query_string = kwargs['q']
  try:
    mongo_query = query.to_mongo_query(query_string)
  except query.InvalidQuery:
    return tangelo.HTTPStatusCode(400, 'Invalid query')

  rep = args[0]
  proj = generate_mongo_projection(args[0])

  limit  = getlimit(kwargs)

  return execute_query(mongo_query, proj, rep, limit)

# the GET entry point
@tangelo.restful
def get(*pargs, **kwargs):
  if len(pargs) == 3:
    return basic_query(pargs, kwargs)
  elif len(pargs) == 1:
    return advanced_query(pargs, kwargs)

  return  tangelo.HTTPStatusCode(400, "Invalid request")
