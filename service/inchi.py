import requests
import json
from subprocess import Popen, PIPE
import tempfile
import os
import sys

config = {}
with open ('../config/conversion.json') as fp:
  config = json.load(fp)


def to_cml(inchi):
  request = requests.get('%s/service/chemical/cjson/?q=inchi~eq~%s' % (config['baseUrl'], inchi))

  if request.status_code == 200:
    cjson = request.json();
  else:
    print >> sys.stderr, "Unable to access REST API: %s" % request.status_code
    return None

  # Call convertion routine
  p = Popen([config['cjsonToCmlPath']], stdin=PIPE, stdout=PIPE, stderr=PIPE)
  stdout, stderr = p.communicate(json.dumps(cjson['results'][0]))

  fd, path = tempfile.mkstemp(suffix='.cml')

  with open(path, 'w') as fp:
    fp.write(str(stdout))

  os.close(fd)

  return path

