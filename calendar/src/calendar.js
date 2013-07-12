(function(){
    var LEFT_MOUSE_BTN = 0;
    var LABELS = {
        prev: '<',
        next: '>',
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                 'August', 'September', 'October', 'November', 'December']
    };
    var TODAY = new Date();
    // remove all time information from date
    TODAY.setUTCHours(0);
    TODAY.setUTCMinutes(0);
    TODAY.setUTCSeconds(0);
    TODAY.setUTCMilliseconds(0);

    // constants used in tracking the type of the current drag/paint operation 
    var DRAG_ADD = "add";
    var DRAG_REMOVE = "remove";

    // constant representing the class of a day that has been 
    // chosen/toggled/selected/whatever
    var CHOSEN_CLASS = "chosen";

    // minifier-friendly strings
    var className = 'className';

    // dom helpers

    // minification wrapper for appendChild
    function appendChild(parent, child) {
        parent.appendChild(child);
    }

    // is valid date object?
    function isValidDateObj(d) {
        return (d instanceof Date)  && !!(d.getTime) && !isNaN(d.getTime());
    }

    /** isArray: * => Boolean

    simplys returns true if the given parameter is an array
    **/
    function isArray(a){
        if(a && a.isArray){
            return a.isArray();
        }
        else{
            return Object.prototype.toString.call(a) === "[object Array]";
        }
    }

    /** makeEl: String => DOM Element

    Takes a string in the format of "tag.classname.classname2" (etc) and
    returns a DOM element of that type with the given classes

    For example, makeEl('div.foo') returns the Node <div class="foo">
    **/
    function makeEl(s) {
        var a = s.split('.');
        var tag = a.shift();
        var el = document.createElement(tag);
        el[className] = a.join(' ');
        return el;
    } 

    /** getLeft: DOM element => Number

    returns the absolute left X coordinate of the given element in relation to 
    the document page
    **/
    function getLeft(el) {
        if(el.getBoundingClientRect){
          return el.getBoundingClientRect().left;
        }
        else if (el.offsetParent) {
          return getLeft(el.offsetParent) + el.offsetLeft;
        } else {
          return el.offsetLeft;
        }
    }

    /** getLeft: DOM element => Number

    returns the absolute top Y coordinate of the given element in relation to 
    the document page
    **/
    function getTop(el) {
        if(el.getBoundingClientRect){
          return el.getBoundingClientRect().top;
        }
        else if (el.offsetParent) {
          return getTop(el.offsetParent) + el.offsetTop;
        } else {
          return el.offsetTop;
        }   
    }

    /** addClass: (DOM element, string)

    minification-friendly wrapper of xtag.addClass
    **/
    function addClass(el, c) {
        xtag.addClass(el, c);
    }

    /** removeClass: (DOM element, string)

    minification-friendly wrapper of xtag.removeClass
    **/
    function removeClass(el, c) {
        xtag.removeClass(el, c);
    }

    /** hasClass: (DOM element, string)

    minification-friendly wrapper of xtag.hasClass
    **/
    function hasClass(el, c) {
        return xtag.hasClass(el, c);
    }

    // Date utils

    function getYear(d) {
        return d.getUTCFullYear();
    }
    function getMonth(d) {
        return d.getUTCMonth();
    }
    function getDate(d) {
        return d.getUTCDate();
    }

    /** pad: (Number, Number) => String
    
    Pads a number with preceding zeros to be padSize digits long

    If given a number with more than padSize digits, truncates the leftmost
    digits to get to a padSize length
    **/
    function pad(n, padSize) {
        var str = n.toString();
        var padZeros = (new Array(padSize)).join('0');
        return (padZeros + str).substr(-padSize);
    }

    /** iso: Date => String 

    returns the ISO format representation of a date ("YYYY-MM-DD")
    **/
    function iso(d) {
        return [pad(getYear(d), 4),
                pad(getMonth(d)+1, 2),
                pad(getDate(d), 2)].join('-');
    }

    /** fromIso: String => Date/null

    Given a string, attempts to parse out a date in YYYY-MM-DD format

    If successful, returns the corresponding Date object, otherwise return null
    **/
    var ISO_DATE_REGEX = /(\d{4})[^\d]?(\d{2})[^\d]?(\d{2})/;
    function fromIso(s){
        if (isValidDateObj(s)) return s;
        var d = ISO_DATE_REGEX.exec(s);
        if (d) {
          return new Date(d[1],d[2]-1,d[3]);
        }
        else{
            return null;
        }
    }

    /** parseSingleDate: String => Date/null

    attempts to parse out the given string as a Date

    If successful, returns the corresponding Date object, otherwise return null

    Valid input formats include any format with a YYYY-MM-DD format or 
    is parseable by Date.parse
    **/
    function parseSingleDate(dateStr){
        if(isValidDateObj(dateStr)) return dateStr;

        // cross-browser check for ISO format that is not 
        // supported by Date.parse without implicit time zone
        var isoParsed = fromIso(dateStr);
        if(isoParsed){
            return isoParsed;
        }
        else{
            var parsedMs = Date.parse(dateStr);
            if(!isNaN(parsedMs)){
                return new Date(parsedMs);
            }
            return null;
        }
    }


    /** parseMultiDates: Array/String => Array/null
    
    Given either an array or a JSON string, attempts to parse out the input into
    the given array format:
     - An array whose elements fall into one of the following two formats
        - A Date object representing a single day
          (if the input uses a string instead, this parser will attempt to 
           parseSingleDate it)
        - A two element list of Date objects representing the start and
          end dates of a range (if the inputs use strings instead, the parser
          will attempt to parseSingleDate them)

    If the input is parseable into this format, return the resulting 2d array
    Otherwise, return null and console.log the parsing error

    If given an array that already follows this format, will simply return it
    **/
    function parseMultiDates(multiDateStr){
        var ranges;
        if(isArray(multiDateStr)){
            ranges = multiDateStr.slice(0); // so that this is nondestructive
        }
        else if(isValidDateObj(multiDateStr)){
            return [multiDateStr];
        }
        else if(typeof(multiDateStr) === "string" && multiDateStr.length > 0){
            // check if this is a JSON representing a range of dates
            try{
                ranges = JSON.parse(multiDateStr);
                if(!isArray(ranges)){
                    console.log("invalid list of ranges", multiDateStr);
                    return null;
                }
            }
            catch(err){
                // check for if this represents a single date
                var parsedSingle = parseSingleDate(multiDateStr);
                if(parsedSingle){
                    return [parsedSingle];
                }
                else{
                    console.log("unable to parse", multiDateStr, 
                                "as JSON or single date");
                    return null;
                }
            }
        }
        else{
            return null;
        }

        // go through and replace each unparsed range with its parsed
        // version (either a singular Date object or a two-item list of
        // a start Date and an end Date)
        for(var i = 0; i < ranges.length; i++){
            var range = ranges[i];

            var components;
            if(isValidDateObj(range)){
                continue;
            }
            // parse out as single date
            else if(typeof(range) === "string"){
                var parsedDate = parseSingleDate(range);
                if(!parsedDate){
                    console.log("unable to parse date", range);
                    return null;
                }
                ranges[i] = parsedDate;
            }
            // parse out as 2-item list/range of start/end date
            else if(isArray(range) && range.length === 2){
                var parsedStartDate = parseSingleDate(range[0]);

                if(!parsedStartDate){
                    console.log("unable to parse start date", range[0], 
                                "from range", range);
                    return null;
                }

                var parsedEndDate = parseSingleDate(range[1]);
                if(!parsedEndDate){
                    console.log("unable to parse end date", range[1], 
                                "from range", range);
                    return null;
                }

                if(parsedStartDate.valueOf() > parsedEndDate.valueOf()){
                    console.log("invalid range", range, 
                                ": start date is after end date");
                    return null;
                }
                ranges[i] = [parsedStartDate, parsedEndDate];
            }
            else{
                console.log("invalid range value: ", range);
                return null;
            }
        }
        return ranges;
    }

    /* from: (Date, number, number, number) => Date

    Create a new date based on the provided date, but with any given 
    year/month/date parameters in place of the base date's
    */
    function from(base, y, m, d) {
        if (y === undefined) y = getYear(base);
        if (m === undefined) m = getMonth(base);
        if (d === undefined) d = getDate(base);
        return new Date(y,m,d);
    }

    /* relOffset: (Date, number, number. number) => Date

    get the date with the given offsets from the base date

    ex: relOffset(foo, 0, -1, 0) returns the date that is exactly one month
        behind foo
    */
    function relOffset(base, y, m, d) {
        return from(base,
                    getYear(base) + y,
                    getMonth(base) + m,
                    getDate(base) + d);
    }

    /** findSunday: Date => Date

    Find the nearest preceding Sunday that is on or earlier than the given date
    **/
    function findSunday(d) {
        while(d.getUTCDay() > 0) {
          d = prevDay(d);
        }
        return d;
    }

    /** findNextSaturday: Date => Date

    Find the nearest succeeding Saturday that is on or later than the given date
    **/
    function findNextSaturday(d){
        while (d.getUTCDay() < 6){
            d = nextDay(d);
        }
        return d;
    }

    /** findFirst: Date => Date

    Find the first day of the date's month.
    **/
    function findFirst(d) {
        while(getDate(d) > 1) {
          d = prevDay(d);
        }
        return d;
    }

    /** findLast: Date => Date

    Find the last day of the date's month.
    **/
    function findLast(d){
        return prevDay(relOffset(d, 0, 1, 0));
    }

    /** nextDay: Date => Date

    Return the day that comes after the given date's
    **/
    function nextDay(d) {
        return relOffset(d, 0, 0, 1);
    }

    /** prevDay: Date => Date

    Return the day that comes before the given date's
    **/
    function prevDay(d) {
        return relOffset(d, 0, 0, -1);
    }

    /** dateMatches: (Date, Date/range Array) => Boolean

    Check whether Date `d` is in the list of Date/Date ranges in `matches`.

    If given a single date to check, will check if the two dates fall on the 
    same date

    If given an array of Dates/2-item Dateranges (ie: the same format returned 
    by parseMultipleDates and used for Calendar._chosenRanges)

    params:
        d                   the date to compare
        matches             if given as a singular date, will check if d is
                            in the same date
                            Otherwise, 
    **/
    function dateMatches(d, matches) {
        if (!matches) return;
        matches = (matches.length === undefined) ? [matches] : matches;
        var foundMatch = false;
        matches.forEach(function(match) {
          if (match.length == 2) {
            if (dateInRange(match[0], match[1], d)) {
              foundMatch = true;
            }
          } else {
            if (iso(match) == iso(d)) {
              foundMatch = true;
            }
          }
        });
        return foundMatch;
    }

    function dateInRange(start, end, d) {
        // convert to strings for easier comparison
        return iso(start) <= iso(d) && iso(d) <= iso(end);
    }

    function sortRanges(ranges){
        ranges.sort(function(rangeA, rangeB){
            var dateA = (isValidDateObj(rangeA)) ? rangeA : rangeA[0];
            var dateB = (isValidDateObj(rangeB)) ? rangeB : rangeB[0];
            return dateA.valueOf() - dateB.valueOf();
        });
    }

    // creates the html elements for a given date, highlighting the
    // given chosen date ranges
    function makeMonth(d, chosen) {
        if (!isValidDateObj(d)) throw 'Invalid view date!';
        var month = getMonth(d);
        var tdate = getDate(d);
        var sDate = findSunday(findFirst(d));

        var monthEl = makeEl('div.month');

        var label = makeEl('div.label');
        label.textContent = LABELS.months[month] + ' ' + getYear(d);

        appendChild(monthEl, label);

        var week = makeEl('div.week');

        var cDate = sDate;

        var done = false;

        while(!done) {
          var day = makeEl('span.day');
          day.setAttribute('data-date', iso(cDate));
          day.textContent = getDate(cDate);
          if (getMonth(cDate) != month) {
            addClass(day, 'badmonth');
          }

          if (dateMatches(cDate, chosen)) {
            addClass(day, CHOSEN_CLASS);
          }

          if(dateMatches(cDate, TODAY)){
            addClass(day, "today");
          }

          appendChild(week, day);
          cDate = nextDay(cDate);
          if (cDate.getUTCDay() < 1) {
            appendChild(monthEl, week);
            week = makeEl('div.week');
            // Are we finished drawing the month?
            // Checks month rollover and year rollover
            done = (getMonth(cDate) > month || 
                    (getMonth(cDate) < month && getYear(cDate) > getYear(sDate))
                   );
          }
        }

        return monthEl;
    }

    function makeControls() {
        var controls = makeEl('div.controls');
        var prev = makeEl('span.prev');
        var next = makeEl('span.next');
        prev.innerHTML = LABELS.prev;
        next.innerHTML = LABELS.next;
        appendChild(controls, prev);
        appendChild(controls, next);
        return controls;
    }

    function Calendar(data) {
        data = data || {};
        this._span = data.span || 1;
        this._multiple = data.multiple || false;
        // initialize private vars
        this._viewDate = this._getSanitizedViewDate(data.view, data.chosen);
        this._chosenRanges = this._getSanitizedChosenRanges(data.chosen, 
                                                                data.view);
        this.el = makeEl('div.calendar');

        this.render(true);
    }

    // given a view Date and a parsed selection range list, return the
    // Date to use as the view, depending on what information is given
    Calendar.prototype._getSanitizedViewDate = function(viewDate, 
                                                        chosenRanges)
    {
        chosenRanges = (chosenRanges === undefined) ? 
                            this.chosen : chosenRanges;

        // if given a valid viewDate, return it
        if(isValidDateObj(viewDate)){
           return viewDate;
        }
        // otherwise if given a single date for chosenRanges, use it
        else if(isValidDateObj(chosenRanges)){
            return chosenRanges;
        }
        // otherwise, if given a valid chosenRanges, return the first date in
        // the range as the view date
        else if(isArray(chosenRanges) && chosenRanges.length > 0){
            var firstRange = chosenRanges[0];
            if(isValidDateObj(firstRange)){
                return firstRange;
            }
            else{
                return firstRange[0];
            }
        }
        // if not given a valid viewDate or chosenRanges, return the current
        // day as the view date
        else{
            return TODAY;
        }
    };

    function _collapseRanges(ranges){
        sortRanges(ranges);

        var collapsed = [];
        for(var i = 0; i < ranges.length; i++){
            var currRange = ranges[i];
            var prevRange = (collapsed.length > 0) ? 
                              collapsed[collapsed.length-1] : null;

            var currStart, currEnd;
            var prevStart, prevEnd;

            if(isValidDateObj(currRange)){
                currStart = currEnd = currRange;
            }
            else{
                currStart = currRange[0];
                currEnd = currRange[1];
            }
            currRange = (dateMatches(currStart, currEnd)) ? 
                             currStart : [currStart, currEnd];

            if(isValidDateObj(prevRange)){
                prevStart = prevEnd = prevRange;
            }
            else if(prevRange){
                prevStart = prevRange[0];
                prevEnd = prevRange[1];
            }
            else{
                collapsed.push(currRange);
                continue;
            }

            // if we should collapse range, merge with previous range
            if(dateMatches(currStart, [prevRange]) || 
               dateMatches(prevDay(currStart), [prevRange]))
            {
                var minStart = (prevStart.valueOf() < currStart.valueOf()) ? 
                                                          prevStart : currStart;
                var maxEnd = (prevEnd.valueOf() > currEnd.valueOf()) ? 
                                                          prevEnd : currEnd;

                var newRange = (dateMatches(minStart, maxEnd)) ? 
                                                minStart : [minStart, maxEnd];
                collapsed[collapsed.length-1] = newRange;
            }
            // if we don't collapse, just add to list
            else{
                collapsed.push(currRange);
            }
        }

        return collapsed;
    }

    Calendar.prototype._getSanitizedChosenRanges = function(chosenRanges, 
                                                              viewDate)
    {
        viewDate = (viewDate === undefined) ? this.view : viewDate;

        var cleanRanges;
        if(isValidDateObj(chosenRanges)){
            cleanRanges = [chosenRanges];
        }
        else if(isArray(chosenRanges)){
            cleanRanges = chosenRanges;
        }
        else if(chosenRanges === null || chosenRanges === undefined || !viewDate){
            cleanRanges = [];
        }
        else{
            cleanRanges = [viewDate];
        }

        var collapsedRanges = _collapseRanges(cleanRanges);
        if((!this.multiple) && collapsedRanges.length > 0){
            var firstRange = collapsedRanges[0];

            if(isValidDateObj(firstRange)){
                return [firstRange];
            }
            else{
                return [firstRange[0]];
            }
        }
        else{
            return collapsedRanges;
        }
    };

    Calendar.prototype.addDate = function(dateObj, append){
        if(isValidDateObj(dateObj)){
            if(append){
                this.chosen.push(dateObj);
                // trigger setter
                this.chosen = this.chosen;
            }
            else{
                this.chosen = [dateObj];
            }
        }
    };

    Calendar.prototype.removeDate = function(dateObj){
        if(!isValidDateObj(dateObj)){
            return;
        }

        var ranges = this.chosen.slice(0);
        for(var i = 0; i < ranges.length; i++){
            var range = ranges[i];
            if(dateMatches(dateObj, [range])){
                ranges.splice(i, 1);

                if(isArray(range)){
                    var rangeStart = range[0];
                    var rangeEnd = range[1];
                    var prevDate = prevDay(dateObj);
                    var nextDate = nextDay(dateObj);

                    if(dateMatches(prevDate, [range])){
                        ranges.push([rangeStart, prevDate]);
                    }

                    if(dateMatches(nextDate, [range])){
                        ranges.push([nextDate, rangeEnd]);
                    }
                }
                this.chosen = _collapseRanges(ranges);
                break;
            }
        }
    };

    Calendar.prototype.hasChosenDate = function(dateObj){
        return dateMatches(dateObj, this._chosenRanges);
    };

    Calendar.prototype.hasVisibleDate = function(dateObj, excludeBadMonths){
        var startDate = this.firstVisibleMonth;
        if(!excludeBadMonths) startDate = findSunday(startDate);

        var endDate = findLast(this.lastVisibleMonth);
        if(!excludeBadMonths) endDate = findNextSaturday(endDate);

        return dateMatches(dateObj, [[startDate, endDate]]);
    };

    /* note that throwing away nodes during an event handler kills the 
       propagation chain
    */
    Calendar.prototype.render = function(preserveNodes){
        var span = this._span;
        var i;
        if(!preserveNodes){
            this.el.innerHTML = "";
            // get first month of the span of months centered on the view
            var ref = this.firstVisibleMonth;
            for (i = 0; i < span; i++) {
                appendChild(this.el, makeMonth(ref, this._chosenRanges));
                // get next month's date
                ref = relOffset(ref, 0, 1, 0);
            }
        }
        // if we want to maintain the original elements without completely
        // wiping and rewriting nodes (ex: when the visible dates don't change)
        else{
            var days = xtag.query(this.el, ".day");
            var day;
            for(i = 0; i < days.length; i++){
                day = days[i];

                if(!day.hasAttribute("data-date")){
                    return;
                }

                var dateIso = day.getAttribute("data-date");
                var parsedDate = fromIso(dateIso);
                if(!parsedDate){
                    return;
                }
                else{
                    if(dateMatches(parsedDate, this._chosenRanges)){
                        addClass(day, CHOSEN_CLASS);
                    } 
                    else{
                        removeClass(day, CHOSEN_CLASS);
                    }

                    if(dateMatches(parsedDate, [TODAY])){
                        addClass(day, "today");
                    }
                    else{
                        removeClass(day, "today");
                    }
                }
            }
        }
    };

    Object.defineProperties(Calendar.prototype, {
        // get first month of the span of months centered on the view
        "firstVisibleMonth": {
            get: function(){
                return findFirst(
                         relOffset(this.view, 0, -Math.floor(this.span/2), 0)
                       );  
            }
        },

        "lastVisibleMonth": {
            get: function(){
                return relOffset(this.firstVisibleMonth, 0, 
                                 Math.max(0, this.span-1), 0);
            }
        },

        "multiple": {
            get: function(){
                return this._multiple;
            },
            set: function(multi){
                this._multiple = multi;
                this.chosen = this._getSanitizedChosenRanges(this.chosen);
                this.render(true);
            }
        },
        "span":{
            get: function(){
                return this._span;
            },
            set: function(newSpan){
                var parsedSpan = parseInt(newSpan, 10);
                if(!isNaN(parsedSpan) && parsedSpan >= 0){
                    this._span = parsedSpan;
                }
                else{
                    this._span = 0;
                }
                this.render(false);
            }
        },

        "view":{
            attribute: {},
            get: function(){
                return this._viewDate;
            },
            set: function(rawViewDate){
                var newViewDate = this._getSanitizedViewDate(rawViewDate);
                var oldViewDate = this._viewDate;
                this._viewDate = newViewDate;

                this.render(getMonth(oldViewDate) === getMonth(newViewDate) &&
                            getYear(oldViewDate) === getYear(newViewDate));
            }
        },

        "chosen": {
            get: function(){
                return this._chosenRanges;
            },
            set: function(newChosenRanges){
                this._chosenRanges = 
                        this._getSanitizedChosenRanges(newChosenRanges);
                this.render(true);
            }
        },

        "chosenString":{
            get: function(){
                if(this.multiple){
                    var isoDates = this.chosen.slice(0);

                    for(var i=0; i < isoDates.length; i++){
                        var range = isoDates[i];
                        if(isValidDateObj(range)){
                            isoDates[i] = iso(range);
                        }
                        else{
                            isoDates[i] = [iso(range[0]), iso(range[1])];
                        }
                    }
                    return JSON.stringify(isoDates);
                }
                else if(this.chosen.length > 0){
                    return iso(this.chosen[0]);
                }
                else{
                    return "";
                }
            }
        }
    });


    // added on the body to delegate dragends to all x-calendars
    xtag.addEvent(document, "tapend", function(e){
        var xCalendars = xtag.query(document, "x-calendar");
        for(var i = 0; i < xCalendars.length; i++){
            var xCalendar = xCalendars[i];
            xCalendar.xtag.dragType = null;
            xCalendar.removeAttribute("active");
        }

        var days = xtag.query(document, "x-calendar .day");
        for(var j=0; j < days.length; j++){
            days[j].removeAttribute("active");
        }
    });

    xtag.register("x-calendar", {
        lifecycle: {
            created: function(){
                this.innerHTML = "";

                var multiple = this.hasAttribute("multiple");
                var chosenRange = this.getAttribute("chosen");
                this.xtag.calObj = new Calendar({
                    span: this.getAttribute("span"),
                    view: parseSingleDate(this.getAttribute("view")),
                    chosen: parseMultiDates(chosenRange),
                    multiple: multiple
                });

                appendChild(this, this.xtag.calObj.el);
                // append controls AFTER calendar to use natural stack order 
                // instead of needing explicit z-index
                appendChild(this, makeControls());

                this.xtag.dragType = null;
            },
            inserted: function(){
                this.render();
            }
        },
        events: {
            // prevent mobile drag scroll
            "touchstart": function(e){
                e.preventDefault();
            },

            "touchenter": function(e){
                console.log(e.target);
                alert(e.target);
            },

            "tap:delegate(.next)": function(e){
                var xCalendar = e.currentTarget;
                xCalendar.nextMonth();

                xtag.fireEvent(xCalendar, "nextmonth");
            },
            "tap:delegate(.prev)": function(e){
                var xCalendar = e.currentTarget;
                xCalendar.prevMonth();

                xtag.fireEvent(xCalendar, "prevmonth");
            },

            // start drag
            "tapstart:delegate(.day)": function(e){
                // prevent firing on right click
                if(e.button && e.button !== LEFT_MOUSE_BTN){
                    return;
                }
                e.preventDefault();
                var xCalendar = e.currentTarget;
                var day = this;

                var isoDate = day.getAttribute("data-date");
                var dateObj = parseSingleDate(isoDate);
                var toggleEventName;
                if(hasClass(day, CHOSEN_CLASS)){
                    xCalendar.xtag.dragType = DRAG_REMOVE;
                    toggleEventName = "datetoggleoff";
                }
                else{
                    xCalendar.xtag.dragType = DRAG_ADD;
                    toggleEventName = "datetoggleon";
                }

                if(!xCalendar.noToggle){
                    xtag.fireEvent(xCalendar, toggleEventName,
                                   {detail: {date: dateObj}});
                }

                xCalendar.setAttribute("active", true);
                day.setAttribute("active", true);
            },

            // drag move
            "tapenter:delegate(.day)": function(e){
                var xCalendar = e.currentTarget;
                var day = this;
                var isoDate = day.getAttribute("data-date");
                var dateObj = parseSingleDate(isoDate);
                if(!xCalendar.noToggle){
                    // trigger a selection if we enter a nonchosen day while in
                    // addition mode
                    if(xCalendar.xtag.dragType === DRAG_ADD && 
                       !(hasClass(day, CHOSEN_CLASS)))
                    {
                        xtag.fireEvent(xCalendar, "datetoggleon", 
                                       {detail: {date: dateObj}});
                    }
                    // trigger a remove if we enter a chosen day while in
                    // removal mode
                    else if(xCalendar.xtag.dragType === DRAG_REMOVE && 
                            hasClass(day, CHOSEN_CLASS))
                    {
                        xtag.fireEvent(xCalendar, "datetoggleoff", 
                                       {detail: {date: dateObj}});
                    }
                }
                if(xCalendar.xtag.dragType){
                    day.setAttribute("active", true);
                }
            },

            "tapleave:delegate(.day)": function(e){
                var day = this;
                day.removeAttribute("active");
            },

            "tap:delegate(.day)": function(e){
                var xCalendar = e.currentTarget;
                var day = this;
                var isoDate = day.getAttribute("data-date");
                var dateObj = parseSingleDate(isoDate);
                
                xtag.fireEvent(xCalendar, "datetap", {detail: {date: dateObj}});
            },

            "datetoggleon": function(e){
                var xCalendar = this;

                xCalendar.toggleDateOn(e.detail.date, xCalendar.multiple);
            },

            "datetoggleoff": function(e){
                var xCalendar = this;

                xCalendar.toggleDateOff(e.detail.date);
            }

        },
        accessors: {
            controls: {
                attribute: {boolean: true}
            },
            multiple: {
                attribute: {boolean: true},
                get: function(){
                    return this.xtag.calObj.multiple;
                },
                set: function(multi){
                    this.xtag.calObj.multiple = multi;
                    this.chosen = this.chosen;
                }
            },
            span: {
                attribute: {},
                get: function(){
                    return this.xtag.calObj.span;
                },
                set: function(newCalSpan){
                    this.xtag.calObj.span = newCalSpan;   
                }
            },
            view: {
                attribute: {},
                get: function(){
                    return this.xtag.calObj.view;
                },
                set: function(newView){
                    var parsedDate = parseSingleDate(newView);
                    if(parsedDate){
                        this.xtag.calObj.view = parsedDate;
                    }
                }
            },
            chosen: {
                attribute: {skip: true},
                get: function(){
                    var chosenRanges = this.xtag.calObj.chosen;
                    // return a single date if multiple selection not allowed
                    if(!this.multiple){
                        if(chosenRanges.length > 0){
                            var firstRange = chosenRanges[0];
                            if(isValidDateObj(firstRange)){
                                return firstRange;
                            }
                            else{
                                return firstRange[0];
                            }
                        }
                        else{
                            return null;
                        }
                    }
                    // otherwise return the entire selection list
                    else{
                        return this.xtag.calObj.chosen;
                    }
                },
                set: function(newDates){
                    var parsedDateRanges = (this.multiple) ? parseMultiDates(newDates) : parseSingleDate(newDates);
                    if(parsedDateRanges && !this.noToggle){
                        this.xtag.calObj.chosen = parsedDateRanges;
                    }
                    else{
                        this.xtag.calObj.chosen = null;
                    }

                    if(this.xtag.calObj.chosenString){
                        // override attribute with auto-generated string
                        this.setAttribute("chosen", 
                                          this.xtag.calObj.chosenString);
                    }
                    else{
                        this.removeAttribute("chosen");
                    }
                }
            },

            noToggle:{
                attribute: {boolean: true, name: "notoggle"},
                set: function(toggleDisabled){
                    if(toggleDisabled){
                        this.chosen = null;
                    }
                }
            },

            firstVisibleMonth:{
                get: function(){
                    return this.xtag.calObj.firstVisibleMonth;
                }
            },
            lastVisibleMonth:{
                get: function(){
                    return this.xtag.calObj.lastVisibleMonth;
                }
            }
        },
        methods: { 
            render: function(preserveNodes){
                this.xtag.calObj.render(preserveNodes);
            },
            // Go back one month.
            prevMonth: function(){
                var calObj = this.xtag.calObj;
                calObj.view = relOffset(calObj.view, 0, -1, 0);
            },
            // Advance one month forward.
            nextMonth: function(){
                var calObj = this.xtag.calObj;
                calObj.view = relOffset(calObj.view, 0, 1, 0);
            },
            toggleDateOn: function(newDateObj, append){
                if(!this.noToggle){
                    this.xtag.calObj.addDate(newDateObj, append);
                    // trigger setter
                    this.chosen = this.chosen;
                }
            },
            toggleDateOff: function(dateObj){
                if(!this.noToggle){
                    this.xtag.calObj.removeDate(dateObj);
                    // trigger setter
                    this.chosen = this.chosen;
                }
            },

            toggleDate: function(dateObj, appendIfAdd){
                if(this.xtag.calObj.hasChosenDate(dateObj)){
                    this.toggleDateOff(dateObj);
                }
                else{
                    this.toggleDateOn(dateObj, appendIfAdd);
                }
            },

            hasVisibleDate: function(dateObj, excludeBadMonths){
                return this.xtag.calObj.hasVisibleDate(dateObj, 
                                                       excludeBadMonths);
            }
        }
    });

})();