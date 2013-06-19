dc.lineChart = function (parent, chartGroup) {
    var DEFAULT_DOT_RADIUS = 5;
    var TOOLTIP_G_CLASS = "dc-tooltip";
    var DOT_CIRCLE_CLASS = "dot";
    var Y_AXIS_REF_LINE_CLASS = "yRef";
    var X_AXIS_REF_LINE_CLASS = "xRef";

    var _chart = dc.stackableChart(dc.coordinateGridChart({}));
    var _renderArea = false;
    var _dotRadius = DEFAULT_DOT_RADIUS;

    _chart.transitionDuration(500);

    _chart.plotData = function () {
        var groups = _chart.allGroups();

        _chart.calculateDataPointMatrixForAll(groups);

        var stackedLayers = _chart.stackedLayers();

        console.log(stackedLayers);

        var layers = _chart.chartBodyG().selectAll("g.stack")
            .data(stackedLayers);

        var layersEnter = layers
            .enter()
            .append("g")
            .attr("class", function (d, i) {
                return "stack " + "_" + i;
            });

        drawLine(layersEnter, layers);

        drawArea(layersEnter, layers);

        drawDots(layersEnter);
    };

    _chart.renderArea = function (_) {
        if (!arguments.length) return _renderArea;
        _renderArea = _;
        return _chart;
    };

    function drawLine(layersEnter, layers) {
        var line = d3.svg.line()
            .x(function (d) {
                return d.x;
            })
            .y(function (d) {
                return d.y;
            });

        layersEnter.append("path")
            .attr("class", "line")
            .attr("stroke", function (d, i) {
                return _chart.colors()(i);
            });

        dc.transition(layers.select("path.line"), _chart.transitionDuration())
            .attr("d", function (d) {
                return line(d.points);
            });
    }

    function calculateY0(d) {
        var yBase = _chart.y()(0);
        var y0 = d.y0;

        if (d.y0 == 0 || d.y == yBase)
            y0 = yBase;

        return y0;
    }

    function drawArea(layersEnter, layers) {
        if (_renderArea) {
            var area = d3.svg.area()
                .x(function (d) {
                    return d.x;
                })
                .y1(function (d) {
                    return d.y;
                })
                .y0(calculateY0);

            layersEnter.append("path")
                .attr("class", "area")
                .attr("fill", function (d, i) {
                    return _chart.colors()(i);
                })
                .attr("d", function (d) {
                    return area(d.points);
                });

            dc.transition(layers.select("path.area"), _chart.transitionDuration())
                .attr("d", function (d) {
                    return area(d.points);
                });
        }
    }

    function drawDots(layersEnter) {
        if (!_chart.brushOn()) {
            layersEnter.each(function (d, i) {
                var layer = d3.select(this);

                var g = layer.append("g").attr("class", TOOLTIP_G_CLASS);

                createRefLines(g);

                var dots = g.selectAll("circle." + DOT_CIRCLE_CLASS)
                    .data(g.datum().points);

                dots.enter()
                    .append("circle")
                    .attr("class", DOT_CIRCLE_CLASS)
                    .attr("r", _dotRadius)
                    .attr("fill", function (d) {
                        return _chart.colors()(i);
                    })
                    .style("fill-opacity", 1e-6)
                    .style("stroke-opacity", 1e-6)
                    .on("mousemove", function (d) {
                        var dot = d3.select(this);
                        showDot(dot);
                        showRefLines(dot, g);
                    })
                    .on("mouseout", function (d) {
                        var dot = d3.select(this);
                        hideDot(dot);
                        hideRefLines(g);
                    })
                    .append("title").text(_chart.title());

                dots.attr("cx", function (d) {
                    return d.x;
                })
                    .attr("cy", function (d) {
                        return d.y;
                    })
                    .select("title").text(_chart.title());

                dots.exit().remove();
            });
        }
    }

    function createRefLines(g) {
        var yRefLine = g.select("path." + Y_AXIS_REF_LINE_CLASS).empty() ? g.append("path").attr("class", Y_AXIS_REF_LINE_CLASS) : g.select("path." + Y_AXIS_REF_LINE_CLASS);
        yRefLine.style("display", "none").attr("stroke-dasharray", "5,5");

        var xRefLine = g.select("path." + X_AXIS_REF_LINE_CLASS).empty() ? g.append("path").attr("class", X_AXIS_REF_LINE_CLASS) : g.select("path." + X_AXIS_REF_LINE_CLASS);
        xRefLine.style("display", "none").attr("stroke-dasharray", "5,5");
    }

    function showDot(dot) {
        dot.style("fill-opacity", .8);
        dot.style("stroke-opacity", .8);
        return dot;
    }

    function showRefLines(dot, g) {
        var x = dot.attr("cx");
        var y = dot.attr("cy");
        g.select("path." + Y_AXIS_REF_LINE_CLASS).style("display", "").attr("d", "M0 " + y + "L" + (x) + " " + (y));
        g.select("path." + X_AXIS_REF_LINE_CLASS).style("display", "").attr("d", "M" + x + " " + _chart.yAxisHeight() + "L" + x + " " + y);
    }

    function hideDot(dot) {
        dot.style("fill-opacity", 1e-6).style("stroke-opacity", 1e-6);
    }

    function hideRefLines(g) {
        g.select("path." + Y_AXIS_REF_LINE_CLASS).style("display", "none");
        g.select("path." + X_AXIS_REF_LINE_CLASS).style("display", "none");
    }

    _chart.dotRadius = function (_) {
        if (!arguments.length) return _dotRadius;
        _dotRadius = _;
        return _chart;
    };

    return _chart.anchor(parent, chartGroup);
};
