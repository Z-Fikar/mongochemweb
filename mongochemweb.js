var mongochem = {}

mongochem.currentQuery = null;
mongochem.viewport = null;
mongochem.connection = null;

function main() {
  console.log("main");
  $('#query-input').bind("keyup", function() {
    var query = $('#query-input').val();
    if (query.length == 0) {
      $('#query-input').removeClass("query-in-progress");
      $('#results-table-body').empty();
    } else {
      $('#query-input').addClass("query-in-progress");
      mongochem.query(mongochem.processQuery(query));
    }
  })

  $.ajax({
    type : 'GET',
    url : 'syntax.html',
    data : $(this).attr('alt'),
    dataType : 'html',
    success : function(data) {
      var popoverOptions = {
        title : 'Query syntax',
        placement : 'bottom',
        trigger : 'hover',
        html : true,
        content : data
      };
      $('#help').popover(popoverOptions);
    },
    error : function(jqXHR, textStatus, errorThrown) {
      console.log(errorThrown);
    }
  })

  mongochem.init();
}

mongochem.processQuery = function(query) {

  var replaceMap = {
    '>=' : '~gte~',
    '<=' : '~lte~',
    '<' : '~lt~',
    '>' : '~gt~',
    '=' : '~eq~',
    '!=' : '~ne~',
    '&' : '~and~',
    '|' : '~or~'
  }

  for ( var op in replaceMap) {
    query = query.replace(op, replaceMap[op]);
  }

  return query;
}

mongochem.query = function(query) {
  var queryOptions = {
    type : 'GET',
    url : 'service/chemical/cjson',
    data : {
      q : query,
      limit : 100
    },
    dataType : 'json',
    success : function(response) {
      $('#query-input').removeClass("query-in-progress");
      $('#query-input').removeClass('invalid-query');
      $('#query-input').addClass('valid-query');
      mongochem.processResults(response['results']);
    },
    error : function(jqXHR, textStatus, errorThrown) {

      if (jqXHR.status == 400) {
        $('#query-input').removeClass('valid-query');
        $('#query-input').addClass('invalid-query');
      }
    }

  };

  // If there is a query in progress abort it
  if (mongochem.currentQuery)
    mongochem.currentQuery.abort("");

  mongochem.currentQuery = mongochem.queueQuery(queryOptions);
}

mongochem.queryQueue = $({});

mongochem.queueQuery = function(queryOptions) {
  var jqXHR;
  var deferred = $.Deferred();
  var promise = deferred.promise();

  function doQuery(next) {
    jqXHR = $.ajax(queryOptions);
    jqXHR.then(next, next);
  }

  mongochem.queryQueue.queue(doQuery);

  promise.abort = function(msg) {
    if (jqXHR) {
      return jqXHR.abort(msg);
    }

    var queue = ajaxQueue.queue(), index = $.inArray(doQuery,
        mongochem.queryQueue);

    if (index > -1) {
      queue.splice(index, 1);
    }

    deferred.rejectWith(queryOptions.context || queryOptions, [ promise, msg,
        "" ]);

    return promise;
  };

  return promise;
};

mongochem.formatFormula = function(formula) {
  var html = []
  var sub = false;
  var isDigit = /[\d]{1}/;

  for ( var i = 0; i < formula.length; i++) {
    var c = formula[i];
    if (isDigit.test(c)) {
      if (sub) {
        html.push(c);
      } else {
        html.push('<sub>');
        html.push(c);
        sub = true;
      }
    } else {
      html.push('</sub>');
      html.push(c);
      sub = false;
    }
  }

  return html.join('');
}

mongochem.diagramHTML = function(inchi) {
  var html = '<embed style="width: 200px;" src="';
  var url = 'service/chemical/svg?q=inchi~eq~' + inchi;

  html += url;
  html += '" type="image/svg+xml" />';

  return html;
}

mongochem.processResults = function(cjsonList) {
  var rows = d3.select('#results-table-body').selectAll("tr").data(cjsonList,
      function(d) {
        return d['inchi'];
      });

  rows.enter().append("tr")
  rows.exit().remove();

  $('#results-table-body tr').off('click').on('click', function(event) {
    data = d3.select($(event.target).parent().get(0)).data();
    mongochem.load(data[0].inchi);
  });

  var cells = rows.selectAll("td")
      .data(
          function(row) {
            return [ mongochem.diagramHTML(row['inchi']), row['name'],
                mongochem.formatFormula(row['formula']), row['mass'],
                row['inchi'] ];
          }).enter().append("td").html(function(d) {
        return d;
      });
}

mongochem.updateView = function() {
  if (mongochem.viewport) {
    mongochem.viewport.invalidateScene();
  }
}

mongochem.initDefaultView = function() {
  var defaultQuery = 'formula=CH*'
  $('#query-input').val(defaultQuery);
  mongochem.query(mongochem.processQuery(defaultQuery));
  mongochem.load('InChI=1S/CH4NO5P/c2-1(3)7-8(4,5)6/h(H2,2,3)(H2,4,5,6)');
}

mongochem.init = function() {
  var config = {
    sessionManagerURL: "http://data.openchemistry.org/paraview",
    name : "WebMolecule",
    description : "Visualize molecules using VTK",
    application : "mol"
  };

  if(!$('body').hasClass("initialized")) {
    $('body').addClass("initialized");
    vtkWeb.start( config,
       function(connection){
         mongochem.connection = connection;

         if(connection.error) {
           alert(connection.error);
           window.close();
         }
         // Load default view
         else {
           mongochem.initDefaultView();
         }
       }, function(msg){
         $(".loading").hide();
         alert("The remote session did not properly start. Try to use embeded url.");
         mongochem.connection = {sessionURL: "ws://" + location.hostname + ":" + location.port + "/ws"};
         mongochem.initDefaultView();;
       });
  }
}

mongochem.connect = function(onConnect) {
  loading = $(".loading"), mongochem.viewport = null;

  if(location.protocol == "http:") {
     mongochem.connection.sessionURL = mongochem.connection.sessionURL.replace("wss:","ws:");
  }

  // Connect to remote server
  vtkWeb.connect(mongochem.connection, function(serverConnection) {
    mongochem.connection = serverConnection;
    onConnect();
  }, function(code, reason) {
    loading.hide();
    alert(reason);
  });
}

mongochem.setupViewport = function() {
  // Create viewport
  mongochem.viewport = vtkWeb.createViewport({
    session : mongochem.connection.session
  });
  mongochem.viewport.bind(".viewport-container");

  // Handle window resize
  $(window).resize(function() {
    if (mongochem.viewport) {
      mongochem.viewport.render();
    }
  }).trigger('resize');
}

mongochem.stop = function() {
  if (false && mongochem.connection.session) {
    mongochem.viewport.unbind();
    mongochem.connection.session.call('vtk:exit');
    mongochem.connection.session.close();
    mongochem.connection.session = null;
  }
}

mongochem.load = function(inchi) {

  var load = function() {
    mongochem.connection.session.call('vtk:load', inchi).then(
    // RPC success callback
    function(res) {

      if (mongochem.viewport == null)
        mongochem.setupViewport();

      mongochem.updateView();
    },

    // RPC error callback
    function(error, desc) {
      console.log("error: " + desc);
    });
  }

  if (mongochem.connection.session == null) {
    mongochem.connect(load);
  } else {
    load();
  }
}
