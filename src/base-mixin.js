/**
## Base Mixin
Base Mixin is an abstract functional object representing a basic dc chart object
for all chart and widget implementations. Methods from the Base Mixin are inherited
and available on all chart implementation in the DC library.
**/
dc.baseMixin = function (_chart) {
    _chart.__dcFlag__ = dc.utils.uniqueId();

    var _dimension;
    var _group;

    var _anchor;
    var _root;
    var _svg;

    var _minWidth = 200;
    var _defaultWidth = function (element) {
        var width = element && element.getBoundingClientRect && element.getBoundingClientRect().width;
        return (width && width > _minWidth) ? width : _minWidth;
    };
    var _width = _defaultWidth;

    var _minHeight = 200;
    var _defaultHeight = function (element) {
        var height = element && element.getBoundingClientRect && element.getBoundingClientRect().height;
        return (height && height > _minHeight) ? height : _minHeight;
    };
    var _height = _defaultHeight;

    var _keyAccessor = dc.pluck('key');
    var _valueAccessor = dc.pluck('value');
    var _label = dc.pluck('key');

    var _ordering = dc.pluck('key');
    var _orderSort;

    var _renderLabel = false;

    var _title = function (d) {
        return _chart.keyAccessor()(d) + ': ' + _chart.valueAccessor()(d);
    };
    var _renderTitle = false;

    var _transitionDuration = 750;

    var _filterPrinter = dc.printers.filters;

    var _renderlets = [];
    var _mandatoryAttributes = ['dimension', 'group'];

    var _chartGroup = dc.constants.DEFAULT_CHART_GROUP;

    var _listeners = d3.dispatch(
        'preRender',
        'postRender',
        'preRedraw',
        'postRedraw',
        'filtered',
        'zoomed');

    var _legend;

    var _filters = [];
    var _filterHandler = function (dimension, filters) {
        dimension.filter(null);

        if (filters.length === 0) {
            dimension.filter(null);
        } else {
            dimension.filterFunction(function (d) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.isFiltered && filter.isFiltered(d)) {
                        return true;
                    } else if (filter <= d && filter >= d) {
                        return true;
                    }
                }
                return false;
            });
        }
        return filters;
    };

    var _data = function (group) {
        return group.all();
    };

    /**
    #### .width([value])
    Set or get the width attribute of a chart. See `.height` below for further description of the
    behavior.

    **/
    _chart.width = function (w) {
        if (!arguments.length) {
            return _width(_root.node());
        }
        _width = d3.functor(w || _defaultWidth);
        return _chart;
    };

    /**
    #### .height([value])
    Set or get the height attribute of a chart. The height is applied to the SVG element generated by
    the chart when rendered (or rerendered). If a value is given, then it will be used to calculate
    the new height and the chart returned for method chaining.  The value can either be a numeric, a
    function, or falsy. If no value is specified then the value of the current height attribute will
    be returned.

    By default, without an explicit height being given, the chart will select the width of its
    anchor element. If that isn't possible it defaults to 200. Setting the value falsy will return
    the chart to the default behavior

    Examples:

    ```js
    chart.height(250); // Set the chart's height to 250px;
    chart.height(function(anchor) { return doSomethingWith(anchor); }); // set the chart's height with a function
    chart.height(null); // reset the height to the default auto calculation
    ```

    **/
    _chart.height = function (h) {
        if (!arguments.length) {
            return _height(_root.node());
        }
        _height = d3.functor(h || _defaultHeight);
        return _chart;
    };

    /**
    #### .minWidth([value])
    Set or get the minimum width attribute of a chart. This only applicable if the width is
    calculated by dc.

    **/
    _chart.minWidth = function (w) {
        if (!arguments.length) {
            return _minWidth;
        }
        _minWidth = w;
        return _chart;
    };

    /**
    #### .minHeight([value])
    Set or get the minimum height attribute of a chart. This only applicable if the height is
    calculated by dc.

    **/
    _chart.minHeight = function (w) {
        if (!arguments.length) {
            return _minHeight;
        }
        _minHeight = w;
        return _chart;
    };

    /**
    #### .dimension([value]) - **mandatory**
    Set or get the dimension attribute of a chart. In dc a dimension can be any valid [crossfilter
    dimension](https://github.com/square/crossfilter/wiki/API-Reference#wiki-dimension).

    If a value is given, then it will be used as the new dimension. If no value is specified then
    the current dimension will be returned.

    **/
    _chart.dimension = function (d) {
        if (!arguments.length) {
            return _dimension;
        }
        _dimension = d;
        _chart.expireCache();
        return _chart;
    };

    /**
    #### .data([callback])
    Set the data callback or retrieve the chart's data set. The data callback is passed the chart's
    group and by default will return `group.all()`. This behavior may be modified to, for instance,
    return only the top 5 groups:
    ```
        chart.data(function(group) {
            return group.top(5);
        });
    ```
    **/
    _chart.data = function (d) {
        if (!arguments.length) {
            return _data.call(_chart, _group);
        }
        _data = d3.functor(d);
        _chart.expireCache();
        return _chart;
    };

    /**
    #### .group([value, [name]]) - **mandatory**
    Set or get the group attribute of a chart. In dc a group is a [crossfilter
    group](https://github.com/square/crossfilter/wiki/API-Reference#wiki-group). Usually the group
    should be created from the particular dimension associated with the same chart. If a value is
    given, then it will be used as the new group.

    If no value specified then the current group will be returned.
    If `name` is specified then it will be used to generate legend label.

    **/
    _chart.group = function (g, name) {
        if (!arguments.length) {
            return _group;
        }
        _group = g;
        _chart._groupName = name;
        _chart.expireCache();
        return _chart;
    };

    /**
    #### .ordering([orderFunction])
    Get or set an accessor to order ordinal charts
    **/
    _chart.ordering = function (o) {
        if (!arguments.length) {
            return _ordering;
        }
        _ordering = o;
        _orderSort = crossfilter.quicksort.by(_ordering);
        _chart.expireCache();
        return _chart;
    };

    _chart._computeOrderedGroups = function (data) {
        var dataCopy = data.slice(0);

        if (dataCopy.length <= 1) {
            return dataCopy;
        }

        if (!_orderSort) {
            _orderSort = crossfilter.quicksort.by(_ordering);
        }

        return _orderSort(dataCopy, 0, dataCopy.length);
    };

    /**
    #### .filterAll()
    Clear all filters associated with this chart.

    **/
    _chart.filterAll = function () {
        return _chart.filter(null);
    };

    /**
    #### .select(selector)
    Execute d3 single selection in the chart's scope using the given selector and return the d3
    selection. Roughly the same as:
    ```js
    d3.select('#chart-id').select(selector);
    ```
    This function is **not chainable** since it does not return a chart instance; however the d3
    selection result can be chained to d3 function calls.

    **/
    _chart.select = function (s) {
        return _root.select(s);
    };

    /**
    #### .selectAll(selector)
    Execute in scope d3 selectAll using the given selector and return d3 selection result. Roughly
    the same as:
    ```js
    d3.select('#chart-id').selectAll(selector);
    ```
    This function is **not chainable** since it does not return a chart instance; however the d3
    selection result can be chained to d3 function calls.

    **/
    _chart.selectAll = function (s) {
        return _root ? _root.selectAll(s) : null;
    };

    /**
     #### .anchor([anchorChart|anchorSelector|anchorNode], [chartGroup])
     Set the svg root to either be an existing chart's root; or any valid [d3 single
     selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying a dom
     block element such as a div; or a dom element or d3 selection. Optionally registers the chart
     within the chartGroup. This class is called internally on chart initialization, but be called
     again to relocate the chart. However, it will orphan any previously created SVG elements.
    **/
    _chart.anchor = function (a, chartGroup) {
        if (!arguments.length) {
            return _anchor;
        }
        if (dc.instanceOfChart(a)) {
            _anchor = a.anchor();
            _root = a.root();
        } else {
            _anchor = a;
            _root = d3.select(_anchor);
            _root.classed(dc.constants.CHART_CLASS, true);
            dc.registerChart(_chart, chartGroup);
        }
        _chartGroup = chartGroup;
        return _chart;
    };

    /**
    #### .anchorName()
    Returns the dom id for the chart's anchored location.

    **/
    _chart.anchorName = function () {
        var a = _chart.anchor();
        if (a && a.id) {
            return a.id;
        }
        if (a && a.replace) {
            return a.replace('#', '');
        }
        return '' + _chart.chartID();
    };

    /**
    #### .root([rootElement])
    Returns the root element where a chart resides. Usually it will be the parent div element where
    the svg was created. You can also pass in a new root element however this is usually handled by
    dc internally. Resetting the root element on a chart outside of dc internals may have
    unexpected consequences.

    **/
    _chart.root = function (r) {
        if (!arguments.length) {
            return _root;
        }
        _root = r;
        return _chart;
    };

    /**
    #### .svg([svgElement])
    Returns the top svg element for this specific chart. You can also pass in a new svg element,
    however this is usually handled by dc internally. Resetting the svg element on a chart outside
    of dc internals may have unexpected consequences.

    **/
    _chart.svg = function (_) {
        if (!arguments.length) {
            return _svg;
        }
        _svg = _;
        return _chart;
    };

    /**
    #### .resetSvg()
    Remove the chart's SVG elements from the dom and recreate the container SVG element.
    **/
    _chart.resetSvg = function () {
        _chart.select('svg').remove();
        return generateSvg();
    };

    function generateSvg() {
        _svg = _chart.root().append('svg')
            .attr('width', _chart.width())
            .attr('height', _chart.height());
        return _svg;
    }

    /**
    #### .filterPrinter([filterPrinterFunction])
    Set or get the filter printer function. The filter printer function is used to generate human
    friendly text for filter value(s) associated with the chart instance. By default dc charts use a
    default filter printer `dc.printers.filter` that provides simple printing support for both
    single value and ranged filters.

    **/
    _chart.filterPrinter = function (_) {
        if (!arguments.length) {
            return _filterPrinter;
        }
        _filterPrinter = _;
        return _chart;
    };

    /**
    #### .turnOnControls() & .turnOffControls()
    Turn on/off optional control elements within the root element. dc currently supports the
    following html control elements.

    * root.selectAll('.reset') - elements are turned on if the chart has an active filter. This type
     of control element is usually used to store a reset link to allow user to reset filter on a
     certain chart. This element will be turned off automatically if the filter is cleared.
    * root.selectAll('.filter') elements are turned on if the chart has an active filter. The text
     content of this element is then replaced with the current filter value using the filter printer
     function. This type of element will be turned off automatically if the filter is cleared.

    **/
    _chart.turnOnControls = function () {
        if (_root) {
            _chart.selectAll('.reset').style('display', null);
            _chart.selectAll('.filter').text(_filterPrinter(_chart.filters())).style('display', null);
        }
        return _chart;
    };

    _chart.turnOffControls = function () {
        if (_root) {
            _chart.selectAll('.reset').style('display', 'none');
            _chart.selectAll('.filter').style('display', 'none').text(_chart.filter());
        }
        return _chart;
    };

    /**
    #### .transitionDuration([duration])
    Set or get the animation transition duration(in milliseconds) for this chart instance. Default
    duration is 750ms.

    **/
    _chart.transitionDuration = function (d) {
        if (!arguments.length) {
            return _transitionDuration;
        }
        _transitionDuration = d;
        return _chart;
    };

    _chart._mandatoryAttributes = function (_) {
        if (!arguments.length) {
            return _mandatoryAttributes;
        }
        _mandatoryAttributes = _;
        return _chart;
    };

    function checkForMandatoryAttributes(a) {
        if (!_chart[a] || !_chart[a]()) {
            throw new dc.errors.InvalidStateException('Mandatory attribute chart.' + a +
                                                      ' is missing on chart[#' + _chart.anchorName() + ']');
        }
    }

    /**
    #### .render()
    Invoking this method will force the chart to re-render everything from scratch. Generally it
    should only be used to render the chart for the first time on the page or if you want to make
    sure everything is redrawn from scratch instead of relying on the default incremental redrawing
    behaviour.

    **/
    _chart.render = function () {
        _listeners.preRender(_chart);

        if (_mandatoryAttributes) {
            _mandatoryAttributes.forEach(checkForMandatoryAttributes);
        }

        var result = _chart._doRender();

        if (_legend) {
            _legend.render();
        }

        _chart._activateRenderlets('postRender');

        return result;
    };

    _chart._activateRenderlets = function (event) {
        if (_chart.transitionDuration() > 0 && _svg) {
            _svg.transition().duration(_chart.transitionDuration())
                .each('end', function () {
                    runAllRenderlets();
                    if (event) {
                        _listeners[event](_chart);
                    }
                });
        } else {
            runAllRenderlets();
            if (event) {
                _listeners[event](_chart);
            }
        }
    };

    /**
    #### .redraw()
    Calling redraw will cause the chart to re-render data changes incrementally. If there is no
    change in the underlying data dimension then calling this method will have no effect on the
    chart. Most chart interaction in dc will automatically trigger this method through internal
    events (in particular [dc.redrawAll](#dcredrawallchartgroup)); therefore, you only need to
    manually invoke this function if data is manipulated outside of dc's control (for example if
    data is loaded in the background using `crossfilter.add()`).

    **/
    _chart.redraw = function () {
        _listeners.preRedraw(_chart);

        var result = _chart._doRedraw();

        if (_legend) {
            _legend.render();
        }

        _chart._activateRenderlets('postRedraw');

        return result;
    };

    _chart.redrawGroup = function () {
        dc.redrawAll(_chart.chartGroup());
    };

    _chart.renderGroup = function () {
        dc.renderAll(_chart.chartGroup());
    };

    _chart._invokeFilteredListener = function (f) {
        if (f !== undefined) {
            _listeners.filtered(_chart, f);
        }
    };

    _chart._invokeZoomedListener = function () {
        _listeners.zoomed(_chart);
    };

    /**
    #### .hasFilter([filter])
    Check whether is any active filter or a specific filter is associated with particular chart instance.
    This function is **not chainable**.

    **/
    _chart.hasFilter = function (filter) {
        if (!arguments.length) {
            return _filters.length > 0;
        }
        return _filters.some(function (f) {
            return filter <= f && filter >= f;
        });
    };

    function removeFilter(_) {
        for (var i = 0; i < _filters.length; i++) {
            if (_filters[i] <= _ && _filters[i] >= _) {
                _filters.splice(i, 1);
                break;
            }
        }
        applyFilters();
        _chart._invokeFilteredListener(_);
    }

    function addFilter(_) {
        _filters.push(_);
        applyFilters();
        _chart._invokeFilteredListener(_);
    }

    function resetFilters() {
        _filters = [];
        applyFilters();
        _chart._invokeFilteredListener(null);
    }

    function applyFilters() {
        if (_chart.dimension() && _chart.dimension().filter) {
            var fs = _filterHandler(_chart.dimension(), _filters);
            _filters = fs ? fs : _filters;
        }
    }

    _chart.replaceFilter = function (_) {
        _filters = [];
        _chart.filter(_);
    };

    /**
    #### .filter([filterValue])
    Filter the chart by the given value or return the current filter if the input parameter is missing.
    ```js
    // filter by a single string
    chart.filter('Sunday');
    // filter by a single age
    chart.filter(18);
    ```

    **/
    _chart.filter = function (_) {
        if (!arguments.length) {
            return _filters.length > 0 ? _filters[0] : null;
        }
        if (_ instanceof Array && _[0] instanceof Array && !_.isFiltered) {
            _[0].forEach(function (d) {
                if (_chart.hasFilter(d)) {
                    _filters.splice(_filters.indexOf(d), 1);
                } else {
                    _filters.push(d);
                }
            });
            applyFilters();
            _chart._invokeFilteredListener(_);
        } else if (_ === null) {
            resetFilters();
        } else {
            if (_chart.hasFilter(_)) {
                removeFilter(_);
            } else {
                addFilter(_);
            }
        }

        if (_root !== null && _chart.hasFilter()) {
            _chart.turnOnControls();
        } else {
            _chart.turnOffControls();
        }

        return _chart;
    };

    /**
    #### .filters()
    Returns all current filters. This method does not perform defensive cloning of the internal
    filter array before returning, therefore any modification of the returned array will effect the
    chart's internal filter storage.

    **/
    _chart.filters = function () {
        return _filters;
    };

    _chart.highlightSelected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, true);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    _chart.fadeDeselected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, true);
    };

    _chart.resetHighlight = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    /**
    #### .onClick(datum)
    This function is passed to d3 as the onClick handler for each chart. The default behavior is to
    filter on the clicked datum (passed to the callback) and redraw the chart group.
    **/
    _chart.onClick = function (d) {
        var filter = _chart.keyAccessor()(d);
        dc.events.trigger(function () {
            _chart.filter(filter);
            _chart.redrawGroup();
        });
    };

    /**
    #### .filterHandler([function])
    Set or get the filter handler. The filter handler is a function that performs the filter action
    on a specific dimension. Using a custom filter handler allows you to perform additional logic
    before or after filtering.

    ```js
    // default filter handler
    function(dimension, filter){
        dimension.filter(filter); // perform filtering
        return filter; // return the actual filter value
    }

    // custom filter handler
    chart.filterHandler(function(dimension, filter){
        var newFilter = filter + 10;
        dimension.filter(newFilter);
        return newFilter; // set the actual filter value to the new value
    });
    ```

    **/
    _chart.filterHandler = function (_) {
        if (!arguments.length) {
            return _filterHandler;
        }
        _filterHandler = _;
        return _chart;
    };

    // abstract function stub
    _chart._doRender = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart._doRedraw = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.legendables = function () {
        // do nothing in base, should be overridden by sub-function
        return [];
    };

    _chart.legendHighlight = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendReset = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendToggle = function () {
        // do nothing in base, should be overriden by sub-function
    };

    _chart.isLegendableHidden = function () {
        // do nothing in base, should be overridden by sub-function
        return false;
    };

    /**
    #### .keyAccessor([keyAccessorFunction])
    Set or get the key accessor function. The key accessor function is used to retrieve the key
    value from the crossfilter group. Key values are used differently in different charts, for
    example keys correspond to slices in a pie chart and x axis positions in a grid coordinate chart.
    ```js
    // default key accessor
    chart.keyAccessor(function(d) { return d.key; });
    // custom key accessor for a multi-value crossfilter reduction
    chart.keyAccessor(function(p) { return p.value.absGain; });
    ```

    **/
    _chart.keyAccessor = function (_) {
        if (!arguments.length) {
            return _keyAccessor;
        }
        _keyAccessor = _;
        return _chart;
    };

    /**
    #### .valueAccessor([valueAccessorFunction])
    Set or get the value accessor function. The value accessor function is used to retrieve the
    value from the crossfilter group. Group values are used differently in different charts, for
    example values correspond to slice sizes in a pie chart and y axis positions in a grid
    coordinate chart.
    ```js
    // default value accessor
    chart.valueAccessor(function(d) { return d.value; });
    // custom value accessor for a multi-value crossfilter reduction
    chart.valueAccessor(function(p) { return p.value.percentageGain; });
    ```

    **/
    _chart.valueAccessor = function (_) {
        if (!arguments.length) {
            return _valueAccessor;
        }
        _valueAccessor = _;
        return _chart;
    };

    /**
    #### .label([labelFunction])
    Set or get the label function. The chart class will use this function to render labels for each
    child element in the chart, e.g. slices in a pie chart or bubbles in a bubble chart. Not every
    chart supports the label function for example bar chart and line chart do not use this function
    at all.
    ```js
    // default label function just return the key
    chart.label(function(d) { return d.key; });
    // label function has access to the standard d3 data binding and can get quite complicated
    chart.label(function(d) { return d.data.key + '(' + Math.floor(d.data.value / all.value() * 100) + '%)'; });
    ```

    **/
    _chart.label = function (_) {
        if (!arguments.length) {
            return _label;
        }
        _label = _;
        _renderLabel = true;
        return _chart;
    };

    /**
    #### .renderLabel(boolean)
    Turn on/off label rendering

    **/
    _chart.renderLabel = function (_) {
        if (!arguments.length) {
            return _renderLabel;
        }
        _renderLabel = _;
        return _chart;
    };

    /**
    #### .title([titleFunction])
    Set or get the title function. The chart class will use this function to render the svg title
    (usually interpreted by browser as tooltips) for each child element in the chart, e.g. a slice
    in a pie chart or a bubble in a bubble chart. Almost every chart supports the title function;
    however in grid coordinate charts you need to turn off the brush in order to see titles, because
    otherwise the brush layer will block tooltip triggering.
    ```js
    // default title function just return the key
    chart.title(function(d) { return d.key + ': ' + d.value; });
    // title function has access to the standard d3 data binding and can get quite complicated
    chart.title(function(p) {
        return p.key.getFullYear()
            + '\n'
            + 'Index Gain: ' + numberFormat(p.value.absGain) + '\n'
            + 'Index Gain in Percentage: ' + numberFormat(p.value.percentageGain) + '%\n'
            + 'Fluctuation / Index Ratio: ' + numberFormat(p.value.fluctuationPercentage) + '%';
    });
    ```

    **/
    _chart.title = function (_) {
        if (!arguments.length) {
            return _title;
        }
        _title = _;
        _renderTitle = true;
        return _chart;
    };

    /**
    #### .renderTitle(boolean)
    Turn on/off title rendering, or return the state of the render title flag if no arguments are
    given.

    **/
    _chart.renderTitle = function (_) {
        if (!arguments.length) {
            return _renderTitle;
        }
        _renderTitle = _;
        return _chart;
    };

    /**
    #### .renderlet(renderletFunction)
    A renderlet is similar to an event listener on rendering event. Multiple renderlets can be added
    to an individual chart.  Each time a chart is rerendered or redrawn the renderlets are invoked
    right after the chart finishes its own drawing routine, giving you a way to modify the svg
    elements. Renderlet functions take the chart instance as the only input parameter and you can
    use the dc API or use raw d3 to achieve pretty much any effect.
    ```js
    // renderlet function
    chart.renderlet(function(chart){
        // mix of dc API and d3 manipulation
        chart.select('g.y').style('display', 'none');
        // its a closure so you can also access other chart variable available in the closure scope
        moveChart.filter(chart.filter());
    });
    ```

    **/
    _chart.renderlet = function (_) {
        _renderlets.push(_);
        return _chart;
    };

    function runAllRenderlets() {
        for (var i = 0; i < _renderlets.length; ++i) {
            _renderlets[i](_chart);
        }
    }

    /**
    #### .chartGroup([group])
    Get or set the chart group to which this chart belongs. Chart groups are rendered or redrawn
    together since it is expected they share the same underlying crossfilter data set.
    **/
    _chart.chartGroup = function (_) {
        if (!arguments.length) {
            return _chartGroup;
        }
        _chartGroup = _;
        return _chart;
    };

    /**
    #### .expireCache()
    Expire the internal chart cache. dc charts cache some data internally on a per chart basis to
    speed up rendering and avoid unnecessary calculation; however it might be useful to clear the
    cache if you have changed state which will affect rendering.  For example if you invoke the
    `crossfilter.add` function or reset group or dimension after rendering it is a good idea to
    clear the cache to make sure charts are rendered properly.

    **/
    _chart.expireCache = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    /**
    #### .legend([dc.legend])
    Attach a dc.legend widget to this chart. The legend widget will automatically draw legend labels
    based on the color setting and names associated with each group.

    ```js
    chart.legend(dc.legend().x(400).y(10).itemHeight(13).gap(5))
    ```

    **/
    _chart.legend = function (l) {
        if (!arguments.length) {
            return _legend;
        }
        _legend = l;
        _legend.parent(_chart);
        return _chart;
    };

    /**
    #### .chartID()
    Returns the internal numeric ID of the chart.
    **/
    _chart.chartID = function () {
        return _chart.__dcFlag__;
    };

    /**
    #### .options(optionsObject)
    Set chart options using a configuration object. Each key in the object will cause the method of
    the same name to be called with the value to set that attribute for the chart.

    Example:
    ```
    chart.options({dimension: myDimension, group: myGroup});
    ```
    **/
    _chart.options = function (opts) {
        for (var o in opts) {
            if (typeof(_chart[o]) === 'function') {
                _chart[o].call(_chart, opts[o]);
            } else {
                dc.logger.debug('Not a valid option setter name: ' + o);
            }
        }
        return _chart;
    };

    /**
    ## Listeners
    All dc chart instance supports the following listeners.

    #### .on('preRender', function(chart){...})
    This listener function will be invoked before chart rendering.

    #### .on('postRender', function(chart){...})
    This listener function will be invoked after chart finish rendering including all renderlets' logic.

    #### .on('preRedraw', function(chart){...})
    This listener function will be invoked before chart redrawing.

    #### .on('postRedraw', function(chart){...})
    This listener function will be invoked after chart finish redrawing including all renderlets' logic.

    #### .on('filtered', function(chart, filter){...})
    This listener function will be invoked after a filter is applied, added or removed.

    #### .on('zoomed', function(chart, filter){...})
    This listener function will be invoked after a zoom is triggered.

    **/
    _chart.on = function (event, listener) {
        _listeners.on(event, listener);
        return _chart;
    };

    return _chart;
};
