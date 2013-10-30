var mongochem = {}

mongochem.currentQuery = null;
mongochem.viewport = null;
mongochem.connection = null;

mongochem.elements = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
                      "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K",
                      "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni",
                      "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb",
                      "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd",
                      "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe", "Cs",
                      "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd",
                      "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta",
                      "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb",
                      "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa",
                      "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
                      "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt",
                      "Ds", "Rg", "Cn", "Uut", "Fl", "Uup", "Lv", "Uus",
                      "Uuo"];

function structureChanged() {
  var smilesString = mongochem.jsmeApplet.smiles();
  if (smilesString.length > 30) {
    smilesString = smilesString.substring(0, 30) + "...";
  }
  $('#smiles-title').html(smilesString);
};

function main() {

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

  $('#structure-search').click(function() {
    if(!$('#jsme-dialog').hasClass("initialized")) {
      $('#jsme-dialog').addClass("initialized");
      $('#jsme-dialog').one('shown.bs.modal', function() {
        mongochem.jsmeApplet = new JSApplet.JSME("jsme_container", "380px", "340px", {
          "options" : "oldlook,star"
        });
        mongochem.jsmeApplet.setNotifyStructuralChangeJSfunction('structureChanged');
      });
    }
    $('#jsme-dialog').modal();
  });

  $('#structure-search-button').click(function() {
    mongochem.queryString('smiles~'+mongochem.jsmeApplet.smiles().toLowerCase());
  });

  $('#view-tab a[href="#card-view-tab"]').tab('show');

  mongochem.init();
}

// Need to have this method to JSME complaining!
function jsmeOnLoad() {

}

mongochem.processQuery = function(query) {

  var replaceMap = {
    '~' : '~slr~',
    '>=' : '~gte~',
    '<=' : '~lte~',
    '<' : '~lt~',
    '>' : '~gt~',
    '!=' : '~ne~',
    '&' : '~and~',
    '|' : '~or~'
  }

  // If the the user has typed an inchi the run inchi=* query
  if (/^InChI=.*/.test(query)) {
    query = 'inchi='+query;
  }

  // Strip of prefix
  query = query.replace('InChI=', '');

  for ( var op in replaceMap) {
    query = query.replace(op, replaceMap[op]);
  }

  // SMILES can have = in them
  if (!/^\s*smiles\s*~.*/.test(query)) {
    query = query.replace('=', '~eq~');
  }

  return query;
}

mongochem.query = function(query) {
  var queryOptions = {
    type : 'GET',
    url : 'service/chemical/cjson',
    data : {
      q : query,
      limit : 40
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

mongochem.diagramHTML = function(inchikey) {
  var html = '<embed style="width: 200px;" src="';
  var url = 'service/chemical/svg?q=inchikey~eq~' + inchikey;

  html += url;
  html += '" type="image/svg+xml" />';

  return html;
}


mongochem.processResultsTableView = function(cjsonList) {
  var rows = d3.select('#results-table-body').selectAll("tr").data(cjsonList,
      function(d) {
        return d['inchi'];
      });

  rows.enter().append("tr")
  rows.exit().remove();

  $('#results-table-body tr').off('click').on('click', function(event) {
    data = d3.select($(event.target).parent().get(0)).data();
    mongochem.load(data[0]);
  });

  var cells = rows.selectAll("td")
      .data(
          function(row) {
            return [ mongochem.diagramHTML(row['inchikey']), row['name'],
                mongochem.formatFormula(row['formula']), row['properties']['molecular mass'],
                'InChI='+row['inchi'] ];
          }).enter().append("td").html(function(d) {
        return d;
      });
}

mongochem.energyTableAlphaBeta = function(data) {
  var table = $('<table>').append(
      $('<tr>', { class: 'molecule-card-alpha-beta-energy'}).append(
                    $('<th>'),
                    $('<th>').html('Alpha'),
                    $('<th>').html('Beta')
                ),
      $('<tr>', { class: 'molecule-card-alpha-beta-energy'}).append(
                    $('<th>').html('Homo'),
                    $('<td>', {id: 'molecule-card-alpha-homo'}),
                    $('<td>', {id: 'molecule-card-beta-homo'})
                ),
      $('<tr>', { class: 'molecule-card-alpha-beta-energy'}).append(
                    $('<th>').html('Lumo'),
                    $('<td>', {id: 'molecule-card-alpha-lumo'}),
                    $('<td>', {id: 'molecule-card-beta-lumo'})
                ),
      $('<tr>', { class: 'molecule-card-alpha-beta-energy'}).append(
                    $('<th>').html('Gap'),
                    $('<td>', {id: 'molecule-card-alpha-gap'}),
                    $('<td>', {id: 'molecule-card-beta-gap'})
                ),
      $('<tr>', { class: 'molecule-card-alpha-beta-energy'}).append(
                    $('<th>').html('Total'),
                    $('<td>', {class: 'molecule-card-total-energy', colspan: '2'})
                )
  )

  return table
}

mongochem.energyTable = function(data) {
  var table = $('<table>').append(
      $('<tr>', { class: 'molecule-card-energy'}).append(
                    $('<th>').html('Homo'),
                    $('<td>', {id: 'molecule-card-homo'})
                ),
      $('<tr>', { class: 'molecule-card-energy'}).append(
                    $('<th>').html('Lumo'),
                    $('<td>', {id: 'molecule-card-lumo'})
                ),
      $('<tr>', { class: 'molecule-card-energy'}).append(
                    $('<th>').html('Gap'),
                    $('<td>', {id: 'molecule-card-gap'})
                ),
      $('<tr>', { class: 'molecule-card-energy'}).append(
                    $('<th>').html('Total'),
                    $('<td>', {class: 'molecule-card-total-energy', colspan: '2'})
                )
  )

  return table
}


mongochem.moleculeCard = function(data) {
  var card = $('<div>', {class: 'panel panel-default molecule-card'})

  card.append(
        $('<div>', {class: 'panel-heading'}).html(
            data['inchikey']
        ),
        $('<div>', {class: 'panel-body'}).append(
            $('<div>', {class: 'row'}).append(
                $('<div>', {class: 'diagram col-md-6'}).html(
                    $(mongochem.diagramHTML(data['inchikey']))
                    ),
                $('<div>', {class: 'col-md-6'}).append(
                    $('<table>', {class: 'table'}).append(
                        $('<tbody>', {id: 'card-table-body'}).append(
                            $('<tr>').append(
                                $('<th>').html('Formula'),
                                $('<td>', {id: 'molecule-card-formula' }).html(
                                      $(mongochem.formatFormula(data['formula']))
                                    )
                            ),
                            $('<tr>').append(
                                $('<th>').html('Mass'),
                                $('<td>', {id: 'molecule-card-mass' }).html(
                                      data['properties']['molecular mass']
                                    )
                            )
                        )
                    )
                )
            )
        )
  )

  if (data.properties['energy']) {
    var energy = data.properties['energy'];

    var alphaHomo = "";
    var alphaLumo = "";
    var alphaGap = "";

    if ('alpha' in energy) {
      alphaHomo = energy['alpha']['homo'];
      alphaLumo = energy['alpha']['lumo'];
      alphaGap = energy['alpha']['gap'];
    }

    var betaHomo = "";
    var betaLumo = "";
    var betaGap = "";

    if ('beta' in energy) {
      betaHomo = energy['beta']['homo'];
      betaLumo = energy['beta']['lumo'];
      betaGap = energy['beta']['gap'];
    }

    var total = energy['total'].toFixed(2);

    var energyTable = null;
    if (alphaHomo == betaHomo && alphaLumo == betaLumo) {
      energyTable = mongochem.energyTable(data);
      $('#molecule-card-homo', energyTable).html(alphaHomo);
      $('#molecule-card-lumo', energyTable).html(alphaLumo);
      $('#molecule-card-gap', energyTable).html(alphaGap);
    }
    else {
      energyTable = mongochem.energyTableAlphaBeta(data)
      $('#molecule-card-alpha-homo', energyTable).html(alphaHomo);
      $('#molecule-card-alpha-lumo', energyTable).html(alphaLumo);
      $('#molecule-card-alpha-gap', energyTable).html(alphaGap);

      $('#molecule-card-beta-homo', energyTable).html(betaHomo);
      $('#molecule-card-beta-lumo', energyTable).html(betaLumo);
      $('#molecule-card-beta-gap', energyTable).html(betaGap);
    }

    $('#card-table-body', card).append(
        $('<tr>').append(
            $('<th>').html('Energy'),
            $('<td>').append(
                energyTable
            )
        )
    )

    $('.molecule-card-total-energy', card).html(total)
  }

  card.mouseenter(function(event) {
    card.addClass('molecule-card-hover');
  })

  card.mouseleave(function(event) {
    card.removeClass('molecule-card-hover');
  })


  return card[0];
}

mongochem.processResultsCardView = function(cjsonList) {
  var cards = d3.select('#cards').selectAll("div .molecule-card").data(cjsonList,
         function(d) {
           return d['inchikey'];
         });

  cards.enter().append(function(d) {
    return mongochem.moleculeCard(d);
  });
  cards.exit().remove();

  $('#cards > div').off('click').on('click', function(event) {
    var cards = $(event.target).parents('.molecule-card');

    if (cards.length == 1) {
      data = d3.select(cards[0]).data();
      mongochem.load(data[0]);
    }
  });
}


mongochem.processResults = function(cjsonList) {
  mongochem.processResultsTableView(cjsonList);
  mongochem.processResultsCardView(cjsonList);
}

mongochem.updateView = function(onDone) {
  if (mongochem.viewport) {
    mongochem.viewport.invalidateScene(onDone);
    mongochem.viewport.render();
  }
}

mongochem.queryString = function(query) {
  $('#query-input').val(query);
  $('#query-input').addClass("query-in-progress");
  mongochem.query(mongochem.processQuery(query));
}

mongochem.initDefaultView = function() {
  var defaultQuery = 'mass>400'
  mongochem.queryString(defaultQuery);
//  mongochem.load({name: '',
//    inchi: 'InChI=1S/C21H11NOSSe/c1-2-14-10-23-11-17(14)19-12(1)3-6-16-15-5-4-13(21-22-7-8-24-21)9-18(15)25-20(16)19/h1-11H',
//    formula: 'C21H11NOSSe',
//    properties: {'molecular mass': 404.3499}});
}

mongochem.init = function() {
  var config = {
    sessionManagerURL: "http://localhost:9000/paraview",
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
         mongochem.connection = {sessionURL: "ws://ulmus:8081/ws"};
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
  if (mongochem.connection.session) {
    mongochem.viewport.unbind();
    mongochem.connection.session.call('vtk:exit');
    mongochem.connection.session.close();
    mongochem.connection.session = null;
  }
}

mongochem.toXYZ = function(cjson) {
  var atomCount = 0
  var xyz = "";

  var elements = cjson['atoms']['elements']['number'];
  var coords = cjson['atoms']['coords']['3d'];

  for(var i=0; i< elements.length; i++) {
    xyz += mongochem.elements[elements[i]-1] + " " + coords[3*i] + " " + coords[3*i+1] + " "
      + coords[3*i+2] + "\n";
    atomCount++;
  }

  return atomCount + "\nGenerated by MongoChemWeb\n" + xyz;
}

mongochem.encodeCharacter = function (string) {
  var encoding = { '\\n': '%0A', '\\s': '%20'}

  for(var reg in encoding) {
    var tmp = new RegExp(reg, 'g');
    string = string.replace(tmp, encoding[reg])
  }

  return string;
}

mongochem.load = function(data) {

  var load = function() {

    //$('#3d-view-dialog').one('shown.bs.modal', function() {
      mongochem.connection.session.call('vtk:load', data.inchikey).then(
      // RPC success callback
      function(res) {

        if (mongochem.viewport == null)
          mongochem.setupViewport();

        mongochem.viewport.resetViewId();

        if (data.name) {
          $('#molecule-name').html(data.name);
          $('#molecule-info-name').html(data.name);
        }
        else {
          $('#molecule-info-name').parent().hide()
        }

        $('#molecule-info-formula').html(mongochem.formatFormula(data.formula));
        $('#molecule-info-weight').html(data.properties['molecular mass']);

        $('#molecule-info-smiles').html('');
        $.get('service/chemical/smiles?q=inchikey~eq~'+data.inchikey, function(smiles) {
          $('#molecule-info-smiles').html(smiles);
        })

        $('#molecule-info-inchikey').html(data.inchikey);

        if (data.properties['energy']) {
          var energy = data.properties['energy'];

          var alphaHomo = energy['alpha']['homo'];
          var alphaLumo = energy['alpha']['lumo'];
          var alphaGap = energy['alpha']['gap'];

          var betaHomo = energy['beta']['homo'];
          var betaLumo = energy['beta']['lumo'];
          var betaGap = energy['beta']['gap'];

          var total = energy['total'];

          if (alphaHomo == betaHomo && alphaLumo == betaLumo) {
            $('.energy').show();
            $('#homo').html(alphaHomo);
            $('#lumo').html(alphaLumo);
            $('#gap').html(alphaGap);
          }
          else {
            $('.alpha-beta-energy').show()
            $('#alpha-homo').html(alphaHomo);
            $('#alpha-lumo').html(alphaLumo);
            $('#alpha-gap').html(alphaGap);

            $('#beta-homo').html(betaHomo);
            $('#beta-lumo').html(betaLumo);
            $('#beta-gap').html(betaGap);
          }

          $('.total-energy').html(total)
        }

        if (data.properties['calculation']) {
          var calc = data.properties['calculation'];
          var theory = calc['theory'];
          var basis = calc['basis'];
          $('#theory').html(theory);
          $('#basis').html(basis);
        }

        var cjson = JSON.stringify(data);
        cjson = mongochem.encodeCharacter(cjson);

        $('#download-cjson').attr('href','data:application/json,' + cjson);
        $('#download-cjson').attr('download', $.trim(data.inchikey)+'.cjson')

        var xyz = mongochem.toXYZ(data);
        xyz = mongochem.encodeCharacter(xyz);

        $('#download-xyz').attr('href','data:chemical/x-xyz,' + xyz);
        $('#download-xyz').attr('download', $.trim(data.inchikey)+'.xyz');
        $('#download-default').attr('href','data:chemical/x-xyz,' + xyz);
        $('#download-default').attr('download', $.trim(data.inchikey)+'.xyz');

        $('#download-cml').attr('href','service/chemical/cml?q=inchikey~eq~'+data.inchikey);
        $('#download-cml').attr('download', $.trim(data.inchikey)+'.cml');

        $('#3d-view-dialog').one('shown.bs.modal', function() {
          mongochem.updateView();
        });

        mongochem.updateView(function() {
          $('#3d-view-dialog').modal();
        });

      },

      // RPC error callback
      function(error, desc) {
        console.log("error: " + desc);
      });
    //});


  }

  if (mongochem.connection.session == null) {
    mongochem.connect(load);
  } else {
    load();
  }
}
