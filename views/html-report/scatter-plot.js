/* eslint-env browser */
/* eslint-disable no-new */
/* globals Rickshaw, DATA */

window.addEventListener('load', function() {
    var chartContainerElem = document.querySelector('#chart-container');
    var chartElem = document.querySelector('#chart');
    var yAxisElem = document.querySelector('#y_axis');

    var formatter = (function() {
        var ymin = Infinity;
        var ymax = -Infinity;

        var yUnits;
        var yShortUnit;
        var yDivisor;

        function getDivisor() {
            if (yDivisor !== undefined) {
                return yDivisor;
            }

            if (ymax > 1000 * 60) {
                yUnits = 'minutes';
                yShortUnit = 'm';
                yDivisor = 1000 * 60;
            } else if (ymax > 1000) {
                yUnits = 'seconds';
                yShortUnit = 's';
                yDivisor = 1000;
            } else {
                yUnits = 'milliseconds';
                yShortUnit = 'ms';
                yDivisor = 1;
            }

            return yDivisor;
        }

        return Object.defineProperties({
            add: function(yval) {
                ymin = Math.min(ymin, Math.floor(yval));
                ymax = Math.max(ymax, Math.ceil(yval));

                // reset these, just in case
                yDivisor = yUnits = yShortUnit = undefined;
            },
            ylabel: function(val) {
                var r = val / getDivisor();

                // skip 0, since it looks funny on the plot
                if (r === 0) {
                    return '';
                }

                // use fixed decimals if the number is no an int
                if (parseInt(r) === r) {
                    return r.toString() + ' ' + yShortUnit;
                } else {
                    return r.toFixed(2) + ' ' + yShortUnit;
                }
            }
        }, {
            yunit: {
                enumerable: true,
                get: function() {
                    getDivisor();
                    return yUnits;
                }
            },
            yshortunit: {
                enumerable: true,
                get: function() {
                    getDivisor();
                    return yShortUnit;
                }
            }
        });
    }());

    var palette = (function() {
        var green = '#8ece40';
        var red = '#ce4040';

        var c = 0;
        var colors = [
            '#65b9ac',
            '#4682b4',
            '#96557e',
            '#785f43',
            '#858772',
            '#b5b6a9'
        ];

        return {
            color: function(name) {
                if (name === 'fullTest') {
                    return green;
                }

                if (name === 'fullTest_Err') {
                    return red;
                }

                return colors[c++ % colors.length];
            }
        };
    }());

    function makeGraph(series) {
        var graph = new Rickshaw.Graph({
            element: chartElem,
            renderer: 'scatterplot',
            stroke: true,
            series: series
        });

        // create the x-axis on the graph
        (new Rickshaw.Graph.Axis.X({
            graph: graph,
            tickFormat: function(n) {
                return n + ' s';
            }
        }));

        // create the y-axis on the graph
        (new Rickshaw.Graph.Axis.Y({
            graph: graph,
            orientation: 'left',
            tickFormat: formatter.ylabel,
            element: yAxisElem
        }));

        // add a hover effect to points on the graph
        (new Rickshaw.Graph.HoverDetail({
            graph: graph,
            xFormatter: function(x) {
                return x + ' s';
            },
            yFormatter: function(y) {
                // the floating label will always be in milliseconds
                return y + ' ms';
            }
        }));

        var legend = new Rickshaw.Graph.Legend({
            element: document.getElementById('legend'),
            graph: graph
        });

        (new Rickshaw.Graph.Behavior.Series.Toggle({
            graph: graph,
            legend: legend
        }));

        (new Rickshaw.Graph.Behavior.Series.Highlight({
            graph: graph,
            legend: legend
        }));

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
                var width = chartContainerElem.offsetWidth;
                var height = parseInt(width * 500 / 1200); // ratio based on original CSS
                // re-render graph
                graph.setSize({ width: width, height: height});
                graph.render();
                // update div size
                chartElem.style.height = height + 'px';
            }, 50);
        });
    }

    var namedSeries = DATA.reduce(function(memo, item) {
        memo[item.name] = memo[item.name] || [];
        memo[item.name].push(item);

        formatter.add(item.y);

        return memo;
    }, {});

    var series = Object.keys(namedSeries).map(function(key) {
        return {
            color: palette.color(key),
            data: namedSeries[key],
            name: key
        };
    });
    
    var createdOnce = false;
    window.SCATTER_PLOT_INIT = function() {
        if (createdOnce === true) {
            return;
        }
        
        createdOnce = true;
        
        makeGraph(series);
    };
});
