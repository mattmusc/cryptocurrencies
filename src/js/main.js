/**
 * Page Controller
 *
 * @author mattmusc
 */

(function (window) {
    if (typeof window.mattmusc === 'undefined') {
        window.mattmusc = {};
    }
    var mattmusc = window.mattmusc;

    var Controller = mattmusc.Controller = function () {
        var ctr = this;

        this.$dateSlider = $('#date-slider');

        this.$date1Label = $('#dateLabel1');
        this.$date2Label = $('#dateLabel2');

        this.$coinSelect = $('#coin-select');
        this.$varSelect = $('#var-select');

        this.lineChartSelector = '#line-area';
        this.donut1Selector = '#donut-area1';
        this.donut2Selector = '#donut-area2';
        this.timelineChartSelector = '#timeline-area';

        this.lineChart = undefined;
        this.timelineChart = undefined;
        this.donutChart1 = undefined;
        this.donutChart2 = undefined;

        this.filteredData = {};
        this.donutData = [];

        this.parseTime = d3.timeParse("%d/%m/%Y");
        this.formatTime = d3.timeFormat("%d/%m/%Y");

        this.dateSliderConf = {
            range: true,
            max: this.parseTime("31/10/2017").getTime(),
            min: this.parseTime("12/5/2013").getTime(),
            step: 86400000, // One day
            values: [this.parseTime("12/5/2013").getTime(), this.parseTime("31/10/2017").getTime()],
            slide: function (event, ui) {
                onDateSliderChanged.call(this, event, ui, ctr);
            }
        };

        this.color = d3.scaleOrdinal(d3.schemeDark2);
    };

    Controller.prototype.init = function (url) {
        d3.json(url)
            .then(this.prepareData.bind(this))
            .then(this.initCharts.bind(this))
            .then(this.attachListeners.bind(this))
            .then(this.updateCharts.bind(this));
    };

    Controller.prototype.prepareData = function (data) {
        var ctr = this;

        // Prepare and clean data
        for (var coin in data) {
            if (!data.hasOwnProperty(coin)) {
                continue;
            }
            ctr.filteredData[coin] = data[coin].filter(function (d) {
                return !(d["price_usd"] == null)
            })
            ctr.filteredData[coin].forEach(function (d) {
                d["price_usd"] = +d["price_usd"];
                d["24h_vol"] = +d["24h_vol"];
                d["market_cap"] = +d["market_cap"];
                d["date"] = ctr.parseTime(d["date"])
            });
            ctr.donutData.push({
                "coin": coin,
                "data": ctr.filteredData[coin].slice(-1)[0]
            })
        }
    };

    Controller.prototype.initCharts = function () {
        var ctr = this;
        this.lineChart = new mattmusc.LineChart({
            selector: this.lineChartSelector,
            color: ctr.color
        });
        this.donutChart1 = new mattmusc.DonutChart({
            selector: this.donut1Selector,
            variable: "24h_vol",
            onClick: function (arc, i, paths) {
                onDonutArcClicked.call(this, arc, i, paths, ctr);
            },
            color: ctr.color
        });
        this.donutChart2 = new mattmusc.DonutChart({
            selector: this.donut2Selector,
            variable: "market_cap",
            onClick: function (arc, i, paths) {
                onDonutArcClicked.call(this, arc, i, paths, ctr);
            },
            color: ctr.color
        });
        this.timelineChart = new Timeline(this.timelineChartSelector, onBrushed.bind(this), onBrushEnd.bind(this));
    };

    Controller.prototype.attachListeners = function () {
        var ctr = this;
        this.$dateSlider.slider(this.dateSliderConf);
        this.$coinSelect.on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
            onCoinSelectChanged(e, clickedIndex, isSelected, previousValue, ctr);
        });
        this.$varSelect.on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
            onVariableSelectChanged(e, clickedIndex, isSelected, previousValue, ctr);
        });
    }

    Controller.prototype.updateCharts = function () {
        var data_ = this.createChartData();

        this.lineChart.updateVis(data_);
        this.donutChart1.updateVis(data_);
        this.donutChart2.updateVis(data_);
        this.timelineChart.updateVis({
            ...data_,
            dates: [this.parseTime("12/5/2013").getTime(), this.parseTime("31/10/2017").getTime()]
        });
    }

    Controller.prototype.createChartData = function () {
        return {
            coins: this.$coinSelect.selectpicker("val"),
            yVariable: this.$varSelect.selectpicker("val"),
            dates: this.$dateSlider.slider("values"),
            data: this.filteredData,
            donutData: this.donutData
        };
    }

    function onDateSliderChanged(event, ui, ctr) {
        ctr.$date1Label.text(ctr.formatTime(new Date(ui.values[0])));
        ctr.$date2Label.text(ctr.formatTime(new Date(ui.values[1])));

        ctr.updateCharts();
    }

    function onCoinSelectChanged(e, clickedIndex, isSelected, previousValue, ctr) {
        ctr.lineChart.updateVis(ctr.createChartData());
    }

    function onVariableSelectChanged(e, clickedIndex, isSelected, previousValue, ctr) {
        ctr.lineChart.updateVis(ctr.createChartData());
    }

    function onDonutArcClicked(arc, i, paths, ctr) {
        ctr.$coinSelect.selectpicker("val", arc.data.coin);
        ctr.updateCharts();
    }

    function onBrushed() {
        var selection = d3.event.selection || this.timelineChart.x.range();
        var newValues = selection.map(this.timelineChart.x.invert)

        this.$dateSlider
            .slider('values', 0, newValues[0])
            .slider('values', 1, newValues[1]);
        this.$date1Label.text(this.formatTime(newValues[0]));
        this.$date2Label.text(this.formatTime(newValues[1]));

        this.updateCharts();
    }

    function onBrushEnd() {
        if (d3.event.selection) return;

        var defaultValues = [this.parseTime("12/5/2013").getTime(), this.parseTime("31/10/2017").getTime()];

        this.$dateSlider
            .slider('values', 0, defaultValues[0])
            .slider('values', 1, defaultValues[1]);
        this.$date1Label.text(this.formatTime(defaultValues[0]));
        this.$date2Label.text(this.formatTime(defaultValues[1]));

        this.updateCharts();
    }

    var controller = window._pageController = new Controller();
    controller.init("data/coins.json");

}(window));