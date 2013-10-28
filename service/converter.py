import requests
import json
from subprocess import Popen, PIPE
import tempfile
import os
import sys

config = {}

current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_dir, '../config/conversion.json')

with open(config_path, 'r') as fp:
  config = json.load(fp)

def cjson_to_cml(cjson):
  # Call convertion routine
  p = Popen([config['cjsonToCmlPath']], stdin=PIPE, stdout=PIPE, stderr=PIPE)
  stdout, stderr = p.communicate(json.dumps(cjson))

  return stdout


def inchikey_to_cml(inchikey):
  request_url = '%s/service/chemical/cjson?q=inchikey~eq~%s' % (config['baseUrl'], inchikey)

  request = requests.get(request_url)

  if request.status_code == 200:
    cjson = request.json();
  else:
    print >> sys.stderr, "Unable to access REST API at %s: %s" % (request_url, request.status_code)
    return None


  return cjson_to_cml(cjson['results'][0])

def inchikey_to_cml_file(inchikey):

  cml = inchikey_to_cml(inchikey)

  fd, path = tempfile.mkstemp(suffix='.cml')

  with open(path, 'w') as file:
    file.write(cml)

  os.close(fd)

  return path
