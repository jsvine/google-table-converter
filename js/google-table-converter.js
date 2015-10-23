(function () {
    var root = this;
    var $input = $("#input .inner");
    var $output_preview = $(".preview-container");
    var $output_raw = $("#output-raw .inner");

    root.gotaco = {
        $input: $input,
        $output_raw: $output_raw,
        $output_preview: $output_preview
    };

    var to_fragment = function (html) {
        if (html instanceof Document) {
            return html.body;
        } else if (html instanceof HTMLElement) {
            return html;
        }
        var parser = new root.DOMParser();
        var doc = parser.parseFromString(html.trim(), "text/html");
        var body = doc.body;
        return body;
    };

    var escape_html = function (html) {
        var escaped = html
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escaped;
    };

    var reset_style = "<style>.converted-google-table { line-height: 1; border-collapse: collapse; border: none; width: 100%; table-layout: fixed; background-color: #FFF; } </style>";

    var add_gotaco_class = function (frag) {
        var table = frag.querySelector("table");
        table.className = "converted-google-table";
        return frag;
    };

    var to_array = function (x) {
        return Array.prototype.slice.call(x);
    };

    var convert_width_to_pct = function (frag) {
        var cols = to_array(frag.querySelectorAll("colgroup col"));
        var widths = cols.map(function (el, i) {
            return parseInt(el.getAttribute("width"), 10);
        });
        var widths_sum = widths.reduce(function (a, b) { return a + b;});
        cols.forEach(function (el, i) {
            var ratio = widths[i] * 100 / widths_sum;
            el.setAttribute("width", Math.round(ratio, 2) + "%");
        });
        var table = frag.querySelector("table");
        var style = table.getAttribute("style");
        var new_style = "max-width: " + widths_sum + "px;";
        table.setAttribute("style", new_style);
        return frag;
    };

    var remove_formulas = function (frag) {
        var matching = frag.querySelectorAll("td[data-sheets-formula]");
        to_array(matching).forEach(function (el, i) {
            el.removeAttribute("data-sheets-formula"); 
        });
        return frag;
    };

    var remove_values = function (frag) {
        var matching = frag.querySelectorAll("td[data-sheets-value]");
        to_array(matching).forEach(function (el, i) {
            el.removeAttribute("data-sheets-value"); 
        });
        return frag;
    };

    var remove_border = function (frag) {
        var table = frag.querySelector("table");
        table.removeAttribute("border");
        var style_orig = table.getAttribute("style");
        var style_new = style_orig.replace(/;border:1px solid #ccc/, "");
        table.setAttribute("style", style_new);
        return frag;
    };

    var combine = function (steps) {
        return function (html_or_frag) {
            var frag = to_fragment(html_or_frag);
            var cleaned = steps.reduce(function (m, step) {
                return step(m);
            }, frag);
            return cleaned;
        };
    };

    var process_html = function (html) {
        var frag = to_fragment(html);
        if (!frag.querySelector("table")) {
            return "Hmmm, this doesn't seem to be a table.";    
        }
        var pipeline = combine([
            add_gotaco_class,
            remove_formulas,
            remove_values,
            remove_border,
            convert_width_to_pct
        ]);
        var processed = pipeline(frag);
        return reset_style + processed.innerHTML;
    };

    var cached = "";

    $input.focus(function (e) {
        cached = this.innerHTML;    
        this.innerHTML = "";
    });

    $input.keyup(function (e) {
        cached = this.innerHTML;
    });

    $input.blur(function (e) {
        if (cached) {
            this.innerHTML = cached;    
        }
        var html = this.innerHTML;
        var processed = process_html(html);
        $output_preview.html(processed);
        $output_raw.html(escape_html(processed));
    });
    $input.blur();

    var MAX_PREVIEW_WIDTH = $output_preview.parent().width();
    root.interact(".preview-container")
        .resizable({
            preserveAspectRatio: false,
            edges: { left: false, right: true, bottom: false, top: false }
        }).on('resizemove', function (event) {
            var target = event.target;
            var width = Math.min(
                Math.max(event.rect.width, 25),
                MAX_PREVIEW_WIDTH
            );
            target.style.width = width + 'px';
            target.setAttribute("data-width", width);
        }); 
    $output_preview.attr("data-width", $output_preview.width());

    $output_raw.click(function () { this.select() });
 
}).call(this);
