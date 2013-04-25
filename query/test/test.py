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

import unittest
import query
import re

#
# unit tests for query parser
#
class TestQueryParser(unittest.TestCase):

  def setUp(self):
    self.seq = range(10)

  def test_valid(self):
    queries = {'mass~gt~0~and~mass~lt~100~or~atomCount~gt~2': {'$or': [{'$and': [{'mass': {'$gt': 0}},{'mass': {'$lt': 100}}]}, {'atomCount': {'$gt': 2}}]} ,
              'atomCount~lt~10~or~mass~lt~10~and~mass~gt~100': {'$or': [{'atomCount': {'$lt': 10}}, {'$and': [{'mass': {'$lt': 10}}, {'mass': {'$gt': 100}}]}]},
              'mass~gt~100': {'mass': {'$gt': 100}},
              'mass~gt~1~and~mass~gt~2~and~mass~gt~3': {'$and': [{'mass': {'$gt': 1}}, {'mass': {'$gt': 2}}, {'mass': {'$gt': 3}}]} ,
              'mass~gt~1~and~mass~gt~2~and~mass~gt~3~or~mass~lt~1': {'$or': [{'$and': [{'mass': {'$gt': 1}}, {'mass': {'$gt': 2}}, {'mass': {'$gt': 3}}]}, {'mass': {'$lt': 1}}]},
              'mass~gt~10~or~mass~gt~11~or~mass~gt~12': {'$or': [{'mass': {'$gt': 10}}, {'mass': {'$gt': 11}}, {'mass': {'$gt': 12}}]} ,
              'mass~gt~2~or~mass~gt~3': {'$or': [{'mass': {'$gt': 2}}, {'mass': {'$gt': 3}}]},
              'mass~lt~1~and~atomCount~gt~23~or~atomCount~lt~1~and~mass~lt~0': {'$or': [{'$and': [{'mass': {'$lt': 1}}, {'atomCount': {'$gt': 23}}]}, {'$and': [{'atomCount': {'$lt': 1}}, {'mass': {'$lt': 0}}]}]},
              'mass~ne~1': {'mass': {'$ne': 1}},
              'mass~eq~1': {'mass': 1},
              'mass~eq~3.14159': {'mass': 3.14159},
              'atomCount~eq~3.14159': {'atomCount': 3.14159},
              'inchi~eq~CH': {'inchi': 'CH'},
              'inchi~eq~CH*': {'inchi': re.compile('^CH.*$')},
              'inchi~ne~CH': {'inchi': {'$ne': 'CH'}},
              'inchi~ne~CH*': {'inchi': {'$ne': 'CH*'}},
              'name~eq~test test~and~mass~gt~1': {'$and': [{'name': 'test test'}, {'mass': {'$gt': 1}}]},
              'name~eq~3-hydroxymyristic acid [2-[[[5-(2,4-diketopyrimidin-1-yl)-3,4-dihydroxy-tetrahydrofuran-2-yl]methoxy-hydroxy-phosphoryl]oxy-hydroxy-phosphoryl]oxy-5-hydroxy-3-(3-hydroxytetradecanoylamino)-6-methylol-tetrahydropyran-4-yl] ester': {'name': '3-hydroxymyristic acid [2-[[[5-(2,4-diketopyrimidin-1-yl)-3,4-dihydroxy-tetrahydrofuran-2-yl]methoxy-hydroxy-phosphoryl]oxy-hydroxy-phosphoryl]oxy-5-hydroxy-3-(3-hydroxytetradecanoylamino)-6-methylol-tetrahydropyran-4-yl] ester'},
              'atomCount~lte~3.14159': {'atomCount': {'$lte':  3.14159}},
              'atomCount~gte~3.14159': {'atomCount': {'$gte':  3.14159}},
              }


    for test_query, expected in queries.iteritems():
      mongo_query = query.to_mongo_query(test_query)
      self.assertEqual(mongo_query , expected)

  def test_invalid(self):
    queries = ['mass~eq~asdfa',
               'mass~eq~2342gh,mass~eq~~eq~3',
               'mass~eq~2342gh']

    for test_query in queries:
      self.assertRaises(query.InvalidQuery, query.to_mongo_query, test_query)


if __name__ == '__main__':
    unittest.main()