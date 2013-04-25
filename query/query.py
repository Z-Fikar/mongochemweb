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
from pyparsing import *
import string
import re

#
# This module contains a parser for a simple query language that can encode
# in value of a URL query parameter without the need to encode any characters.
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
#   mass~eq~100   - Find all molecules with a mass of 100
#   mass~eq~100~and~atomCount~gt~3 - Find all molecules with a mass of 100 and
#   an atomCount of greater than 3.
#
#

# Define the supported operators
EQ = '~eq~'
NE = '~ne~'
GT = '~gt~'
GTE = '~gte~'
LT = '~lt~'
LTE = '~lte~'
OR = '~or~'
AND = '~and~'

# The root of the operator hierarchy
class Operator(object):
  def __init__(self, t):
    self.args = t[0][::2]
    self.op = t[0][1]

  def query(self):
    pass

# basic comparison
class Comparison(Operator):
  _op_map = {
             GT : '$gt',
             GTE : '$gte',
             LT : '$lt',
             LTE : '$lte',
             NE : '$ne'
            }

  def query(self):
    q = dict()
    q[self.args[0]] = {self._op_map[self.op]: self.args[1]}

    return q

# numeric equals
class NumericEquals(Comparison):
  def query(self):
    return {self.args[0]: self.args[1]}

# string equals
class StringEquals(Comparison):
  def query(self):
    value = self.args[1]
    if '*' in value:
      value = value.replace('*', '.*')
      value = re.compile('^%s$' % value)

    return {self.args[0]: value}

# boolean operators
class BooleanOp(Operator):
  _op_map = {
             AND: '$and',
             OR: '$or'
             }

  def query(self):
    q = dict()

    op_args = []
    for arg in self.args:
      op_args.append(arg.query())

    q[self._op_map[self.op]] = op_args

    return q


class And(BooleanOp):
  def query(self):
    q = dict()

    and_args = []
    for arg in self.args:
      and_args.append(arg.query())

    q['$and'] = and_args

    return q

class Or(BooleanOp):
  def query(self):
    q = dict()

    or_args = []

    for arg in self.args:
      or_args.append(arg.query())

    q['$or'] = or_args

    return q

# Define the syntax of the query language
integer = Word(nums).setParseAction(lambda t: int(t[0]))
real = Combine(Word(nums) + "." + Word(nums)).setParseAction(lambda t: float(t[0]))
numeric_field = oneOf('mass atomCount')
string_field = oneOf('name formula inchi inchikey')
string = Word(string.letters+string.digits+'=/-*[](), ')
comparision = oneOf([EQ, NE, GT, GTE, LT, LTE])
boolean = oneOf([AND, OR])
comparison_operand = real | integer | numeric_field
comparison_string_operand = string_field | string


numeric_comparison = operatorPrecedence(comparison_operand,
                                [(GT, 2, opAssoc.LEFT, Comparison),
                                 (GTE, 2, opAssoc.LEFT, Comparison),
                                 (LT, 2, opAssoc.LEFT, Comparison),
                                 (LTE, 2, opAssoc.LEFT, Comparison),
                                 (NE, 2, opAssoc.LEFT, Comparison),
                                 (EQ, 2, opAssoc.LEFT, NumericEquals)]
                                )

string_comparison = operatorPrecedence(comparison_string_operand,
                                       [(EQ, 2, opAssoc.LEFT, StringEquals),
                                        (NE, 2, opAssoc.LEFT, Comparison)]
                                       )

comparison =  numeric_comparison | string_comparison

boolean_expression = operatorPrecedence(comparison,
                           [(AND, 2, opAssoc.LEFT, BooleanOp),
                            (OR, 2, opAssoc.LEFT, BooleanOp)]
                          )

class InvalidQuery(Exception):
  def __init__(self, query):
    self.query = query

  def __str__(self, *args, **kwargs):
    return "Invalid query: %s" % self.query

# main function used by external modules to convert query into dict that can
# be used with pymongo find function.
def to_mongo_query(query):
  try:
    result = boolean_expression.parseString(query, parseAll=True)
  except ParseException:
    raise InvalidQuery(query)

  if len(result) != 1:
    raise InvalidQuery(query)

  if not isinstance(result[0], Operator):
    raise InvalidQuery(query)

  print result[0]

  return result[0].query()
