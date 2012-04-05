define([
"dojo/_base/declare", 
"dojo/_base/sniff", 
"dojo/_base/event", 
"dojo/_base/lang", 
"dojo/_base/array", 
"dojo/cldr/supplemental",
"dojo/dom", 
"dojo/dom-class", 
"dojo/dom-style",
"dojo/dom-construct", 
"dojo/date", 
"dojo/date/locale", 
"dojo/_base/fx", 
"dojo/on", 
"dijit/_WidgetBase", 
"dijit/_TemplatedMixin", 
"dijit/_WidgetsInTemplateMixin", 
"./StoreMixin", 
"dojox/widget/_Invalidating", 
"dojox/widget/Selection", 
"dojox/calendar/time", 
"dojo/i18n!./nls/buttons"],	
function(
declare, 
has, 
event, 
lang, 
arr, 
cldr, 
dom, 
domClass, 
domStyle,
domConstruct, 
date, 
locale, 
fx, 
on,  
_WidgetBase, 
_TemplatedMixin, 
_WidgetsInTemplateMixin, 
StoreMixin, 
_Invalidating, 
Selection, 
timeUtil,
_nls){
	
	/*=====
		var _WidgetBase = dijit._WidgetBase;	
		var Selection = dojox.widget.Selection;	
		var _Invalidating = dojox.widget._Invalidating;
		var StoreMixin = dojox.calendar.StoreMixin;
		var _TemplatedMixin = dojox.calendar._TemplatedMixin;
		var _WidgetsInTemplateMixin = dojox.calendar._WidgetsInTemplateMixin;
		
	=====*/ 
	
	return declare("dojox.calendar.CalendarBase", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, StoreMixin, _Invalidating, Selection], {
		
		// summary:		
		//		This class defines a generic calendar widget that manages several views to display event in time.
		
		baseClass: "dojoxCalendar",
		
		//	datePackage: Object
		//		JavaScript namespace to find Calendar routines. Uses Gregorian Calendar routines at dojo.date by default.
		datePackage: date,
		
		//	startDate: Date
		//		The start date of the displayed time interval.
		startDate: null,

		//	endDate: Date
		//		The end date of the displayed time interval (included).		
		endDate: null,
		
		//	date:Date
		//		The reference date used to determine along with the <code>dateInterval</code> 
		//		and <code>dateIntervalSteps</code> properties the time interval to display.
		date: null,
	
		//	dateInterval:String
		//		The date interval used to compute along with the <code>date</code> and 
		//		<code>dateIntervalSteps</code> the time interval to display.
		//		Valid values are "day", "week" (default value) and "month".
		dateInterval: "week",
		
		//	dateInterval:Integer
		//		The number of date intervals used to compute along with the <code>date</code> and 
		//		<code>dateInterval</code> the time interval to display.
		//		Default value is 1.		
		dateIntervalSteps: 1,		
		
		//	viewContainer: Node
		//		The DOM node that will contains the views.
		viewContainer: null,
		
		//	firstDayOfWeek: Integer
		//		(Optional) The first day of week override. By default the first day of week is determined 
		//		for the current locale (extracted from the CLDR).
		//		Special value -1 (default value), means use locale dependent value.
		firstDayOfWeek: -1, 
		
		//	formatItemTimeFunc: Function?
		//		Optional function to format the time of day of the item renderers.
		//		The function takes the date and render data object as arguments and returns a String.
		formatItemTimeFunc: null,
		
		//	editable: Boolean
		//		A flag that indicates whether or not the user can edit
		//		items in the data provider.
		//		If <code>true</code>, the item renderers in the control are editable.
		//		The user can click on an item renderer, or use the keyboard or touch devices, to move or resize the associated event.
		editable: true,
		
		//	moveEnabled: Boolean
		//	A flag that indicates whether the user can move items displayed.
		//	If <code>true</code>, the user can move the items.
		moveEnabled: true,
		
		//	A flag that indicates whether the items can be resized.
		//	If <code>true</code>, the control supports resizing of items.
		resizeEnabled: true,
		
		//	columnView: dojox.calendar.ColumnView
		//		The column view is displaying one day to seven days time intervals.
		columnView: null,
		
		//	matrixView: dojox.calendar.MatrixView
		//		The column view is displaying time intervals that lasts more than seven days.
		matrixView: null,
		
		//	columnViewProps: Object
		//		Map of property/value passed to the constructor of the column view.
		columnViewProps: null,
		
		//	matrixViewProps: Object
		//		Map of property/value passed to the constructor of the matrix view.
		matrixViewProps: null,
		
		_currentViewIndex: -1,
		
		views: null,
		
		_calendar: "gregorian",
		
		constructor: function(/*Object*/args){
			this.views = [];
			
			this.invalidatingProperties = ["store", "items", "startDate", "endDate", "views", 
				"date", "dateInterval", "dateIntervalSteps", "firstDayOfWeek"];
			
			// TODO: not dynamic??
			args = args || {};
			this._calendar = args.datePackage ? args.datePackage.substr(args.datePackage.lastIndexOf(".")+1) : this._calendar;
			this.datePackage = args.datePackage || this.datePackage;
			this.dateFuncObj = typeof this.datePackage == "string" ?
				lang.getObject(this.datePackage, false) :// "string" part for back-compat, remove for 2.0
				this.datePackage;
			this.dateClassObj = this.dateFuncObj.Date || Date;
			this.dateLocaleModule = lang.getObject("locale", false, this.dateFuncObj);
			
			this.invalidateRendering();
		},
		
		destroy: function(preserveDom){
			arr.forEach(this._buttonHandles, function(h){
				h.remove();
			});
			this.inherited(arguments);
		},
				
		buildRendering: function(){
			this.inherited(arguments);
			if(this.views == null || this.views.length == 0){
				this.set("views", this._createDefaultViews());	
			}			
		},
		
		_applyAttributes: function(){
			this._applyAttr = true;
			this.inherited(arguments);
			delete this._applyAttr;
		},
		
		////////////////////////////////////////////////////
		//
		// Getter / setters
		//
		////////////////////////////////////////////////////
				
		_setStartDateAttr: function(value){
			this._set("startDate", value);
			this._timeRangeInvalidated = true;
		},
		
		_setEndDateAttr: function(value){
			this._set("endDate", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateAttr: function(value){
			this._set("date", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateIntervalAttr: function(value){
			this._set("dateInterval", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateIntervalStepsAttr: function(value){
			this._set("dateIntervalSteps", value);
			this._timeRangeInvalidated = true;
		},
		
		_setFirstDayOfWeekAttr: function(value){
			this._set("firstDayOfWeek", value);
			if(this.get("date") != null && this.get("dateInterval") == "week"){
				this._timeRangeInvalidated = true;
			}			
		},
		
		_setTextDirAttr: function(value){
			arr.forEach(this.views, function(view){
				view.set("textDir", value);
			});
		},
		
		///////////////////////////////////////////////////
		//
		// Validating
		//
		///////////////////////////////////////////////////
		
		refreshRendering: function(){
			//	tags
			//		private
			this.inherited(arguments);						
			this._validateProperties();
		},
		
		_refreshItemsRendering: function(){
			if(this.currentView){
				this.currentView._refreshItemsRendering();
			}
		},
				
		_validateProperties: function(){
			var cal = this.dateFuncObj;
			var startDate = this.get("startDate");
			var endDate = this.get("endDate");
			var date = this.get("date");
			
			if(this.firstDayOfWeek < -1 || this.firstDayOfWeek > 6){
				this._set("firstDayOfWeek", 0);
			}
			
			if(date == null && (startDate != null || endDate != null)){
				
				if(startDate == null){
					startDate = new this.dateClassObj();
					this._set("startDate", startDate);
					this._timeRangeInvalidated = true;
				}
				
				if(endDate == null){
					endDate = new this.dateClassObj();
					this._set("endDate", endDate);
					this._timeRangeInvalidated = true;
				}
				
				if(cal.compare(startDate, endDate) >= 0){
					endDate = cal.add(startDate, "day", 1);
					this._set("endDate", endDate);
					this._timeRangeInvalidated = true;
				}
			
			}else{
			
				if(this.date == null){
					this._set("date", new this.dateClassObj());
					this._timeRangeInvalidated = true;
				}
				
				var dint = this.get("dateInterval");
				if(dint != "day" && dint != "week" && dint != "month"){
					this._set("dateInterval", "day");
					this._timeRangeInvalidated = true;
				}
				
				var dis = this.get("dateIntervalSteps");
				if(lang.isString(dis)){
					dis = parseInt(dis);
					this._set("dateIntervalSteps", dis);
				}
				if(dis <= 0) {
					this.set("dateIntervalSteps", 1);
					this._timeRangeInvalidated = true;
				}
			}
			
			if(this._timeRangeInvalidated){
				this._timeRangeInvalidated = false;
				var timeInterval = this.computeTimeInterval();
				
				if(this._timeInterval == null || 
					 cal.compare(this._timeInterval[0], timeInterval[0] != 0) || 
					 cal.compare(this._timeInterval[1], timeInterval[1] != 0)){
					this.onTimeIntervalChange({
						oldStartTime: this._timeInterval == null ? null : this._timeInterval[0],
						oldEndTime: this._timeInterval == null ? null : this._timeInterval[1],
						startTime: timeInterval[0],
						endTime: timeInterval[1]
					});
				}
				
				this._timeInterval = timeInterval;
				
				var duration = this.dateFuncObj.difference(this._timeInterval[0], this._timeInterval[1], "day");
				var view = this._computeCurrentView(timeInterval[0], timeInterval[1], duration);
				
				var index = arr.indexOf(this.views, view);
				
				if(view == null || index == -1){
					return;
				}
				
				this._configureView(view, index, timeInterval, duration);
				
				if(index != this._currentViewIndex){
					if(this.currentView == null){
						view.set("items", this.items);
						this.set("currentView", view);			
					}else{
						
						if(this.items == null || this.items.length == 0){
							this.set("currentView", view);
							view.set("items", this.items);
						}else{
							this.currentView = view;
							view.set("items", this.items);
							this.set("currentView", view);													
						}																	
					}											
				}
			}
		},
		
		_timeInterval: null,
		
		computeTimeInterval: function(){
			//	summary:
			//		Computes the displayed time interval according to the date, dateInterval and 
			//		dateIntervalSteps if date is not null or startDate and endDate properties otherwise.
			//
					
			var cal = this.dateFuncObj;
			var d = this.get("date");
			
			if(d == null){
				return [ this.floorToDay(this.get("startDate")), cal.add(this.get("endDate"), "day", 1) ];
			}else{
				
				var s = this.floorToDay(d);
				var di = this.get("dateInterval");
				var dis = this.get("dateIntervalSteps");
				var e;
				
				switch(di){
					case "day":						
						e = cal.add(s, "day", dis);
						break;
					case "week":
						s = this.floorToWeek(s);
						e = cal.add(s, "week", dis);
						break;
					case "month":
						s.setDate(1);
						e = cal.add(s, "month", dis);						
						break;
				}				
				return [s, e];
			}			
		},
		
		onTimeIntervalChange: function(e){
			//	summary:
			//		Event dispatched when the displayed time interval has changed.
			//	e: Object
			//		An event that contains the oldStartTime, startTime, oldEndTime and endTime properties.
		},					
		
		/////////////////////////////////////////////////////
		//
		// View Management
		//
		/////////////////////////////////////////////////////
		
		//	views: dojox.calendar.ViewBase[]
		//		The views displayed by the widget.
		//		To add/remove only one view, prefer, respectively, the addView() or removeView() methods.
		views: null,
		
		_setViewsAttr: function(views){
			if(!this._applyAttr){
				// 1/ in create() the constructor parameters are mixed in the widget 
				// 2/ in _applyAttributes(), every property with a setter is called.
				// So no need to call on view removed for a non added view.... 
				for(var i=0;i<this.views.length;i++){
					this._onViewRemoved(this.views[i]);
				}
			}
			if(views != null){
				for(var i=0;i<views.length;i++){
					this._onViewAdded(views[i]);
				}			
			}
			this._set("views",  views == null ? [] : views.concat());			
		},
		
		_getViewsAttr: function(){
			return this.views.concat();
		},
		
		_createDefaultViews: function(){
			//	summary:
			//		Creates the default views.
			//		This method does nothing and is designed to be overridden.
			
		},
		
		addView: function(view, index){
			//	summary:
			//		Add a view to the calendar's view list.
			//	view: dojox.calendar.ViewBase
			//		The view to add to the calendar.
			//	index: Integer
			//		Optional, the index where to insert the view in current view list.					
			if(index <= 0 || index > this.views.length){
				index = this.views.length;
			}
			this.views.splice(index, view);
			this._onViewAdded(view);
		},
		
		removeView: function(view){
			//	summary:
			//		Removes a view from the calendar's view list.
			//	view: dojox.calendar.ViewBase
			//		The view to remove from the calendar.
			if(index < 0 || index >=  this.views.length){
				return;
			}
			
			this._onViewRemoved(this.views[index]);
			this.views.splice(index, 1);
		},
		
		_onViewAdded: function(view){
			view.owner = this;
			view.buttonContainer = this.buttonContainer;
			view._calendar = this._calendar;
			view.datePackage = this.datePackage;
			view.dateFuncObj = this.dateFuncObj;
			view.dateClassObj = this.dateClassObj;
			view.dateLocaleModule = this.dateLocaleModule;
			domStyle.set(view.domNode, "display", "none");			
			domClass.add(view.domNode, "view");
			domConstruct.place(view.domNode, this.viewContainer);
			this.onViewAdded(view);
		},
		
		onViewAdded: function(view){
			//	summary:
			//		Event dispatched when a view is added from the calendar.
			//	view: dojox.calendar.ViewBase
			//		The view that has been added to the calendar.
		},
		
		_onViewRemoved: function(view){
			view.owner = null;
			view.buttonContainer = null;
			domClass.remove(view.domNode, "view");
			this.viewContainer.removeChild(view.domNode);
			this.onViewRemoved(view);
		},
		
		onViewRemoved: function(view){			
			//	summary:
			//		Event dispatched when a view is removed from the calendar.
			//	view: dojox.calendar.ViewBase
			//		The view that has been removed from the calendar.
		},
		
		_setCurrentViewAttr: function(view){
			var index = arr.indexOf(this.views, view);
			if(index != -1){
				var oldView = this.get("currentView");
				this._currentViewIndex = index;
				this._set("currentView", view);
				
				this._showView(oldView, view);
				this.onCurrentViewChange({
					oldView: oldView,
					newView: view
				});
			}					
		},
				
		_getCurrentViewAttr: function(){
			return this.views[this._currentViewIndex];		
		},
		
		onCurrentViewChange: function(e){
			//	summary:
			//		Event dispatched when the current view has changed.
			//	e: Event
			//		Object that contains the oldView and newView properties.
		},
		
		_configureView: function(view, index, timeInterval, duration){
			//	summary:
			//		Configures the view to show the specified time interval.
			//		This method is computing and setting the 
			//			| "startDate", "columnCount" for a column view,
			//      | "startDate", "columnCount", "rowCount", "refStartTime" and "refEndTime" for a matrix view.
			//		This method can be extended to configure other properties like layout properties for example.
			//	view: dojox.calendar.ViewBase
			//		The view to configure.
			//	index: Integer
			//		The index of the view in the Calendar view list.
			//	timeInterval: Date[]
			//		The time interval that will be displayed by the view.
			//	duration: Integer
			//		The duration, in days, of the displayed time interval.
			var cal = this.dateFuncObj;
			if(view.viewKind == "columns"){
				view.set("startDate", timeInterval[0]);
				view.set("columnCount", duration);
			}else if(view.viewKind == "matrix"){
				if(duration > 7){ // show only full weeks.
					var s = this.floorToWeek(timeInterval[0]);					
					var e = this.floorToWeek(timeInterval[1]);
					if(cal.compare(e, timeInterval[1]) != 0){
						e = this.dateFuncObj.add(e, "week", 1);
					}					
					duration = this.dateFuncObj.difference(s, e, "day");
					view.set("startDate", s);
					view.set("columnCount", 7);
					view.set("rowCount", Math.ceil(duration/7));
					view.set("refStartTime", timeInterval[0]);
					view.set("refEndTime", timeInterval[1]);					
				}else{ 
					view.set("startDate", timeInterval[0]);
					view.set("columnCount", duration);
					view.set("rowCount", 1);
					view.set("refStartTime", null);
					view.set("refEndTime", null);
				}				
			}
		},
		
		_computeCurrentView: function(startDate, endDate, duration){
			//	summary:
			//		If the time range is lasting less than seven days returns the column view or the matrix view otherwise.
			//	startDate: Date
			//		The start date of the displayed time interval
			//	endDate: Date
			//		The end date of the displayed time interval	
			//	duration: Integer
			//		Duration of the 		
			//	return: dojox.calendar.ViewBase
			//		The view to display.
			return duration <= 7 ? this.columnView : this.matrixView;
		},
		
		matrixViewRowHeaderClick: function(e){
			//	summary:
			//		Function called when the cell of a row header of the matrix view is clicked.
			//		|	If another row is already expanded, collapse it and then expand the clicked row.
			//		|	If the clicked row is already expadned, collapse it.
			//		|	If no row is expanded, expand the click row.
			//	e: Object
			//		The row header click event.
			var expIndex = this.matrixView.getExpandedRowIndex();
				if(expIndex == e.index){
					this.matrixView.collapseRow();
				}else if(expIndex == -1){
					this.matrixView.expandRow(e.index);
				}else{
					var h = this.matrixView.on("expandAnimationEnd", lang.hitch(this, function(){
						h.remove();
						this.matrixView.expandRow(e.index);
					}));
					this.matrixView.collapseRow();
				}
		},
		
		columnViewColumnHeaderClick: function(e){
			//	summary:
			//		Function called when the cell of a column header of the column view is clicked.
			//		Show the time range defined by the clicked date.
			//	e: Object
			//		The column header click event.
			var cal = this.dateFuncObj;
			if(cal.compare(e.date, this._timeInterval[0]) == 0 && this.dateInterval == "day" && this.dateIntervalSteps == 1){
				this.set("dateInterval", "week");
			}else{
				this.set("date", e.date);
				this.set("dateInterval", "day");
				this.set("dateIntervalSteps", 1);
			}
		},
		
		//	viewFadeDuration: Integer
		//		The duration in milliseconds of the fade animation when the current view is changing.
		viewChangeDuration: 0,
		
		_showView: function(oldView, newView){
			//	summary:
			//		Displays the current view.
			//	oldView: dojox.calendar.ViewBase
			//		The previously displayed view or null.
			//	newView: dojox.calendar.ViewBase
			//		The view to display.
			if(oldView != null){
				if(this.viewChangeDuration <= 0){					
					domStyle.set(oldView.domNode, "display", "none");
				}else{
					fx.fadeOut({
						node: oldView.domNode, 
						curve:[0, 1], 
						onEnd: function(){							
							domStyle.set(oldView.domNode, "display", "none");
						}
					}).play(this.viewChangeDuration);
				}				
			}
			if(newView != null){												
				domStyle.set(newView.domNode, "display", "block");
				newView.resize();
				if(oldView != null && this.viewChangeDuration > 0){
					fx.fadeIn({node:newView.domNode, curve:[0, 1]}).play(this.viewChangeDuration);
				}else if(!has("ie") || has("ie") != 7){
					domStyle.set(newView.domNode, "opacity", "1");
				}
			}
		},
		
		////////////////////////////////////////////////////
		//
		// Store & data
		//
		////////////////////////////////////////////////////
		
		_setItemsAttr: function(value){
			this._set("items", value);
			if(this.currentView){
				this.currentView.set("items", value);
				this.currentView.invalidateRendering();
			}
		},
		
		/////////////////////////////////////////////////////
		//
		// Time utilities
		//
		////////////////////////////////////////////////////
		
		floorToDay: function(date, reuse){
			//	summary:
			//		Floors the specified date to the start of day.
			//	date: Date
			//		The date to floor.
			//	reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			//	returns: Date
			return timeUtil.floorToDay(date, reuse, this.dateClassObj);
		},
		
		floorToWeek: function(d){
			//	summary:
			//		Floors the specified date to the beginning of week.
			//	date: Date
			//		Date to floor.
			return timeUtil.floorToWeek(d, this.dateClassObj, this.dateFuncObj, this.firstDayOfWeek, this.locale);
		},
		
		newDate: function(obj){
			//	summary:
			//		Creates a new Date object.
			//	obj: Object
			//		This object can have several values:
			//		|the time in milliseconds since gregorian epoch.
			//		|a Date instance
			//	returns: Date
			return timeUtil.newDate(obj, this.dateClassObj);			
		},
		
		isToday: function(date){
			//	summary:
			//		Returns whether the specified date is in the current day.
			//	date: Date
			//		The date to test.
			//	renderData: Object
			//		The current renderData
			//	returns: Boolean
			return timeUtil.isToday(date, this.dateClassObj);
		},
		
		isStartOfDay: function(d){
			//	summary:
			//		Tests if the specified date represents the starts of day. 
			//	d:Date
			//		The date to test.
			//	returns: Boolean
			return timeUtil.isStartOfDay(d, this.dateClassObj, this.dateFuncObj);
		},
		
		floorDate: function(date, unit, steps, reuse){
			//	summary:
			//		floors the date to the unit.
			//	date: Date
			//		The date/time to floor.
			//	unit: String
			//		The unit. Valid values are "minute", "hour", "day".
			//	steps: Integer
			//		For "day" only 1 is valid.
			//	reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.			
			//	returns: Date
			return timeUtil.floor(date, unit, steps, reuse, this.classFuncObj);
		},
		
		/////////////////////////////////////////////////////
		//
		// Time navigation
		//
		////////////////////////////////////////////////////
		
		nextRange: function(){
			this._navigate(1);
		},
		
		previousRange: function(){
			this._navigate(-1);
		},
		
		_navigate: function(dir){
			var d = this.get("date");
			var cal = this.dateFuncObj;
			
			if(d == null){
				var s = this.get("startDate");
				var e = this.get("endDate");
				var dur = cal.difference(s, e, "day");
				if(dir == 1){								
					e = cal.add(e, "day", 1);
					this.set("startDate", e);
					this.set("endDate", cal.add(e, "day", dur));
				}else{
					s = cal.add(s, "day", -1);
					this.set("startDate", cal.add(s, "day", -dur));
					this.set("endDate", s);
				}
			}else{
				var di = this.get("dateInterval");
				var dis = this.get("dateIntervalSteps");
				this.set("date", cal.add(d, di, dir * dis));
			}
		},
		
		goToday: function(){
			//	summary:
			//		Changes the displayed time interval to show the current day.
			//		Sets the date property to the current day, the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 1.
			this.set("date", this.floorToDay(new this.dateClassObj(), true));
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 1);			
		},
		
		////////////////////////////////////////////////////
		//
		// Buttons
		//
		////////////////////////////////////////////////////
		
		postCreate: function(){
			this.inherited(arguments);
			this.configureButtons();
		},
		
		configureButtons: function(){
			//	summary:
			//		Set the localized labels of the buttons and the event handlers. 					
			
			var h = [];
			var rtl = !this.isLeftToRight();
			
			if(this.previousButton){
				this.previousButton.set("label", _nls[rtl?"nextButton":"previousButton"]);
				h.push(
					on(this.previousButton, "click", lang.hitch(this, rtl?this.nextRange:this.previousRange))
				);	
			}
			
			if(this.nextButton){
				this.nextButton.set("label", _nls[rtl?"previousButton":"nextButton"]);
				h.push(
					on(this.nextButton, "click", lang.hitch(this, rtl?this.previousRange:this.nextRange))
				);	
			}
			
			if(rtl && this.previousButton && this.nextButton){
				var t = this.previousButton;
				this.previousButton = this.nextButton;
				this.nextButton = t;
			}
			
			if(this.todayButton){
				this.todayButton.set("label", _nls.todayButton);
				h.push(
					on(this.todayButton, "click", lang.hitch(this, this.todayButtonClick))
				);	
			}
			
			if(this.dayButton){
				this.dayButton.set("label", _nls.dayButton);
				h.push(
					on(this.dayButton, "click", lang.hitch(this, this.dayButtonClick))
				);
			}		
			
			if(this.weekButton){
				this.weekButton.set("label", _nls.weekButton);
				h.push(
					on(this.weekButton, "click", lang.hitch(this, this.weekButtonClick))
				);	
			}		

			if(this.fourDaysButton){
				this.fourDaysButton.set("label", _nls.fourDaysButton);
				h.push(
					on(this.fourDaysButton, "click", lang.hitch(this, this.fourDaysButtonClick))
				);
			}
			
			if(this.monthButton){
				this.monthButton.set("label", _nls.monthButton);
				h.push(
					on(this.monthButton, "click", lang.hitch(this, this.monthButtonClick))
				);	
			}	
			
			this._buttonHandles = h;
		},
		
		todayButtonClick: function(e){
			//	summary:
			//		The action triggered when the today button is clicked.
			//		By default, calls the goToday() method.
			this.goToday();
		},
		dayButtonClick: function(e){
			//	summary:
			//		The action triggerred when the day button is clicked.
			//		By default, sets the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 1.
			if(this.get("date") == null){
				this.set("date", this.floorToDay(new this.dateClassObj(), true));
			}			
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 1);								
		},
		
		weekButtonClick: function(e){
			//	summary:
			//		The action triggered when the week button is clicked.
			//		By default, sets the dateInterval property to "week" and 
			//		the "dateIntervalSteps" to 1.
			this.set("dateInterval", "week");
			this.set("dateIntervalSteps", 1);						
		},
		fourDaysButtonClick: function(e){
			//	summary:
			//		The action triggerred when the 4 days button is clicked.
			//		By default, sets the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 4.
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 4);		
		},
		monthButtonClick: function(e){
			//	summary:
			//		The action triggered when the month button is clicked.
			//		By default, sets the dateInterval property to "month" and 
			//		the "dateIntervalSteps" to 1.
			this.set("dateInterval", "month");
			this.set("dateIntervalSteps", 1);		
		},
					
		/////////////////////////////////////////////////////
		//
		// States item
		//
		////////////////////////////////////////////////////
		
		updateRenderers: function(obj, stateOnly){
			if(this.currentView){
				this.currentView.updateRenderers(obj, stateOnly);
			}			
		},

		getIdentity: function(item){
			return item ? item.id : null; 
		},

		_setHoveredItem: function(item, renderer){			
			if(this.hoveredItem && item && this.hoveredItem.id != item.id || 
				item == null || this.hoveredItem == null){
				var old = this.hoveredItem;
				this.hoveredItem = item;
				
				this.updateRenderers([old, this.hoveredItem], true);
				
				if(item && renderer){
					this.currentView._updateEditingCapabilities(item, renderer);
				}
			}
		},
		
		hoveredItem: null,
		
		isItemHovered: function(item){
			//	summary:
			//		Returns whether the specified item is hovered or not.
			//	item: Object
			//		The item.
			//	returns: Boolean								
			return this.hoveredItem != null && this.hoveredItem.id == item.id;			
		},
		
		////////////////////////////////////////////////////////////////////////
		//
		// Editing 
		//
		////////////////////////////////////////////////////////////////////////

		isItemEditable: function(item, rendererKind){
			//	summary:
			//		Computes whether particular item renderer can be edited.
			//		By default it is using the editable property value.
			//	item: Object
			//		The item represented by the renderer.
			//	rendererKind: String
			//		The kind of renderer.
			//	returns: Boolean
			return this.editable;
		},
		
		isItemMoveEnabled: function(item, rendererKind){
			//	summary:
			//		Computes whether particular item renderer can be moved.
			//		By default it is using the moveEnabled property value.
			//	item: Object
			//		The item represented by the renderer.
			//	rendererKind: String
			//		The kind of renderer.
			//	returns: Boolean
			return this.isItemEditable() && this.moveEnabled;
		},
		
		isItemResizeEnabled: function(item, rendererKind){
			//	summary:
			//		Computes whether particular item renderer can be resized.
			//		By default it is using the resizedEnabled property value.
			//	item: Object
			//		The item represented by the renderer.
			//	rendererKind: String
			//		The kind of renderer.
			//	returns: Boolean
			
			return this.isItemEditable() && this.resizeEnabled;
		},
		
		////////////////////////////////////////////////////////////////////////
		//
		// Widget events
		//
		////////////////////////////////////////////////////////////////////////
		
		onGridClick: function(e){
			//	summary:
			//		Event dispatched when the grid has been clicked.
		},
		
		onGridDoubleClick: function(e){
			//	summary:
			//		Event dispatched when the grid has been double-clicked.			
		},	
		
		onItemClick: function(e){
			//	summary:
			//		Event dispatched when an item renderer has been clicked.
		},
		
		onItemDoubleClick: function(e){
			//	summary:
			//		Event dispatched when an item renderer has been double-clicked.
		},
		
		onItemEditBegin: function(e){
			//	summary:
			//		Event dispatched when the item is entering the editing mode.
		},
		
		onItemEditEnd: function(e){
			//	summary:
			//		Event dispatched when the item is leaving the editing mode.
		},
		
		onItemEditBeginGesture: function(e){
			//	summary:
			//		Event dispatched when an editing gesture is beginning.
		},
		
		onItemEditMoveGesture: function(e){
			//	summary:
			//		Event dispatched during a move editing gesture.			
		},
		
		onItemEditResizeGesture: function(e){
			//	summary:
			//		Event dispatched during a resize editing gesture.
		},
		
		onItemEditEndGesture: function(e){
			//	summary:
			//		Event dispatched at the end of an editing gesture.
		},
		
		onItemRollOver: function(e){
			//	Summary:
			//		Event dispatched when the mouse cursor in going over an item renderer. 			
		},
		
		onItemRollOut: function(e){
			//	Summary:
			//		Event dispatched when the mouse cursor in leaving an item renderer.
		},
		
		onColumnHeaderClick: function(e){
			//	summary:
			//		Event dispatched when a column header cell is dispatched.
			//		e: Event
			//		The event has the following properties:
			//			| index: Integer
			//			|		The column index. 
			//			| date: Date
			//			|		The date displayed by the column.
			//			| triggerEvent: Event
			//			|		The origin event.
		},
				
		onRowHeaderClick: function(e){
			//	summary:
			//		Event dispatched when a row header cell is clicked.
		},		
		
		onRendererCreated: function(renderer){
			//	summary:
			//		Event dispatched when an item renderer has been created.
			//	renderer: dojox.calendar._RendererMixin
			//		The renderer created.
		},
		
		onRendererRecycled: function(renderer){
			//	summary:
			//		Event dispatched when an item renderer has been recycled.
			//	renderer: dojox.calendar._RendererMixin
			//		The renderer created.
		},
		
		onRendererReused: function(renderer){
			//	summary:
			//		Event dispatched when an item renderer that was recycled is reused.
			//	renderer: dojox.calendar._RendererMixin
			//		The renderer created.
		},
		
		onRendererDestroyed: function(renderer){
			//	summary:
			//		Event dispatched when an item renderer is destroyed.
			//	renderer: dojox.calendar._RendererMixin
			//		The renderer created.
		},
		
		onRenderersLayoutDone: function(view){
			//	summary:
			//		Event triggered when item renderers layout has been done.				
		}

	}) 
});