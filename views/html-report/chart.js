/* eslint-env browser */
/* eslint-disable no-new */
/* globals Rickshaw, DATA */

var chartContainer = document.querySelector('#chart_container');
var chart = document.querySelector('#chart');

function makeGraph(series) {
    var graph = new Rickshaw.Graph({
        element: chart,
        renderer: 'scatterplot',
        stroke: true,
        series: series
    });

    var first = series[0].data[0].x; // very first request
    
    // create the x-axis on the graph
    (new Rickshaw.Graph.Axis.X({
        graph: graph,
        tickFormat: function(n) {
            return Math.round((n - first) / 1000) + ' s';
        }
    }));

    // create the y-axis on the graph
    (new Rickshaw.Graph.Axis.Y({
        graph: graph,
        orientation: 'left',
        tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
        element: document.getElementById('y_axis')
    }));

    // add a hover effect to points on the graph
    (new Rickshaw.Graph.HoverDetail({
        graph: graph,
        xFormatter: function(x) { return x + ' ms'; },
        yFormatter: function(y) { return y + ' ms'; }
    }));

    (new Rickshaw.Graph.Legend({
        element: document.getElementById('legend'),
        graph: graph
    }));

//    var shelving = new Rickshaw.Graph.Behavior.Series.Toggle({
//        graph: graph,
//        legend: legend
//    });

//    var highlighter = new Rickshaw.Graph.Behavior.Series.Highlight({
//        graph: graph,
//        legend: legend
//    });

    graph.render();

    // resize based on window resize
    var timeout;
    
    window.addEventListener('resize', function(ev) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        
        // trigger tolerance
        // event can executes multiple times for one single resize
        timeout = setTimeout(function() {
            var width = chartContainer.offsetWidth;
            var height = parseInt(width * 500 / 1200); // ratio based on original CSS
            // re-render graph
            graph.setSize({ width: width, height: height});
            graph.render();
            // update div size
            chart.style.height = height + 'px';
        }, 100);
    });
}

var namedSeries = DATA.reduce(function(memo, item) {
    memo[item.name] = memo[item.name] || [];
    memo[item.name].push(item);

    return memo;
}, {});

var series = Object.keys(namedSeries).map(function(key) {
    return {
        name: key,
        data: namedSeries[key]
    };
});

makeGraph(series);
