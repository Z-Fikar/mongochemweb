var mongochem = {}

function main() {
  console.log("main");
  $('#query-input').bind("keyup", function() {
    var query = $('#query-input').val();
    if (query.length == 0) {
      $('#query-input').removeClass("query-in-progress");
      $('#results-table-body').empty();
    }
    else {
      $('#query-input').addClass("query-in-progress");
      mongochem.query(mongochem.processQuery(query));
    }
  })

}



mongochem.processQuery = function(query) {

  var replaceMap = {'<': '~lt~',
                    '>': '~gt~',
                    '=': '~eq~',
                    '!=': '~ne~',
                    '>=': '~gte~',
                    '<=': '~lte~'}

  for (var op in replaceMap) {
    query = query.replace(op, replaceMap[op]);
  }

  return query;
}


mongochem.query = function(query) {
  var queryOptions = {
    type: 'GET',
    url: 'service/chemical/cjson',
    data: {
      q: query,
      limit: 100
    },
    dataType: 'json',
    success: function(response) {
      $('#query-input').removeClass("query-in-progress");
      $('#query-input').removeClass('invalid-query');
      $('#query-input').addClass('valid-query');
      mongochem.processResults(response['results']);
    },
    error: function(jqXHR, textStatus, errorThrown ) {

      if (jqXHR.status == 400) {
        $('#query-input').removeClass('valid-query');
        $('#query-input').addClass('invalid-query');
      }
    }

  };

  mongochem.queueQuery(queryOptions);
}

mongochem.queryQueue = $({});

mongochem.queueQuery = function(queryOptions) {
  var jqXHR

  function doQuery( next ) {
      jqXHR = $.ajax(queryOptions);
      jqXHR.then(next, next);
  }

  mongochem.queryQueue.queue(doQuery);
};

mongochem.formatFormula = function(formula) {
 var html = []
 var sub = false;
 var isDigit = /[\d]{1}/;

   for(var i=0; i<formula.length; i++) {
    var c = formula[i];
    if (isDigit.test(c)) {
     if (sub) {
       html.push(c);
     }
     else {
       html.push('<sub>');
       html.push(c);
       sub = true;
     }
   }
   else {
     html.push('</sub>');
     html.push(c);
     sub = false;
   }
 }

 return html.join('');
}

mongochem.diagramHTML = function(inchi) {
  var html = '<embed src="';
  var url = 'service/chemical/svg?q=inchi~eq~' + inchi;

  html += url;
  html += '" type="image/svg+xml" />';

  return html;
}

mongochem.processResults = function(cjsonList) {
    var rows = d3.select('#results-table-body').selectAll("tr")
        .data(cjsonList, function(d) {
          return d['inchi'];
        });

    rows.enter().append("tr");
    rows.exit().remove();

    var cells = rows.selectAll("td")
        .data(function(row) {
               return [mongochem.diagramHTML(row['inchi']), row['name'], mongochem.formatFormula(row['formula'])];
        })
        .enter()
        .append("td")
        .html(function(d) { return d; });


}
