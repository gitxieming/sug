(function($){

    $.tools = $.tools || {version: '1.0'};
    /*默认参数*/
    $.tools.suggest = {
        wrapperID:'suggestItemsWrapper',   //提示层默认id
        wrapperWidth:'',    //提示层的宽度，默认为input框的宽度
        defaultWrapperClass:'suggest-items-wrapper',    //默认的提示层class名
        addWrapperClass : "",   // 添加的提示层class名，用于同一页面有多个suggest时样式化提示层，默认只有suggest-items-wrapper
        divShim:'divShim',   //iframe默认id
        isJsonp:false,   //是否jsonp形式
        isTriggerFocus:false,  //是否触发focus
        onAfterPressEnter:function(e, self){}  //自定义事件，按回车键选择后触发，可用来做是否提交表单等
      
    };
    /*
     * 插件方法主体，一个插件的代码都写在这里
     * @param handle 调用对
     * @param conf   插件配置
     * @param fn     回调函数
     */
    var itemsWrapper = null,
        divShim = null,
        eventStatus = undefined;
    function Suggest(handle, conf, fn) {
        var self = handle;
        var timer = null;
        self.dataCache = {};
        var checkValueTimer = null;
        $.extend(self,{
            onSelect : function(e, currentItem){
                // console.log('runing onSelect....');
                if (self._isRunning) {
                    self.stop();
                }
                if (itemsWrapper.css('display') == 'none') {
                    return;
                }
                var e = e || $.Event();
                if (e.keyCode === 40) {
                    self.goDown(currentItem, e);
                    return;
                }
                if (e.keyCode === 38) {
                    self.goUp(currentItem, e);
                    return;
                }
                if (e.keyCode === 13) {
                    self.fillInputTxt(currentItem.text());
                    self.hideWrapper();
                    //触发自定义事件
                    e.type = "onAfterPressEnter";
                    self.trigger(e,[self]);
                    if (e.isDefaultPrevented()) { return; }
                }
                if (e.keyCode === 27) {
                    self.hideWrapper();
                    return;
                }
            },
            //向上
            goUp : function(currentItem, e){
                var prevItem = currentItem.closest('li').prev('li');
                if (currentItem.length == 0) {
                    currentItem = itemsWrapper.find('li').last();
                    currentItem.addClass('on');
                    self.fillInputTxt(currentItem.text());
                    return;
                }
                if (prevItem.length == 0) {
                    currentItem.removeClass('on');
                    currentItem.closest('ul').find('li').last().addClass('on');
                    self.fillInputTxt(currentItem.closest('ul').find('li').last().text());
                    return;
                }
                currentItem.removeClass('on');
                prevItem.addClass('on');
                self.fillInputTxt(prevItem.text());
            },
            //向下
            goDown : function(currentItem, e){
                var nextItem = currentItem.closest('li').next('li');
                if (currentItem.length == 0) {
                    currentItem = itemsWrapper.find('li').first();
                    currentItem.addClass('on');
                    self.fillInputTxt(currentItem.text());
                    return;
                }
                if (nextItem.length == 0) {
                    currentItem.removeClass('on');
                    currentItem.closest('ul').find('li').first().addClass('on');
                    self.fillInputTxt(currentItem.closest('ul').find('li').first().text());
                    return;
                }
                currentItem.removeClass('on');
                nextItem.addClass('on');
                self.fillInputTxt(nextItem.text());
            },
            //填值
            fillInputTxt:function(text){
                if (!text) {
                    return;
                }
                var input = $('body').data('whichInput');
                if (input) {
                    clearInterval(checkValueTimer);
                    input.val(text);
                }
            },
            //获取请求url
            getUrl:function(){
                return conf.url;
            },
            //设置请求url
            setUrl:function(url){
                conf.url = url;
            },
            //隐藏提示层
            hideWrapper:function(){
                $('#' + conf.wrapperID).hide();
                divShim && divShim.hide();
            },
            showWrapper:function(){
                $('#' + conf.wrapperID).show();
                divShim && divShim.show();  
            },
            /**
             * 启动计时器，开始监听用户输入
             */
            start:function (e, options) {
                self._timer = setTimeout(function () {
                    // console.log('is setTimeout...');
                    getData( self, e, options );
                    self._timer = setTimeout(arguments.callee, 200);
                }, 200);

                self._isRunning = true;
            },
            /**
             * 停止计时器
             */
            stop:function () {
                if (self._timer) {
                    clearTimeout(self._timer);
                }
                self._isRunning = false;
            }
        });
        
        /* 绑定自定义事件 */
        $.each(['onAfterPressEnter'],function(i,name){
                if ($.isFunction(conf[name]))
                {
                    self.bind(name,conf[name]);
                }else if (self[conf[name]])
                {
                    self.bind(name,self[conf[name]]);
                }
        });
        //添加相应事件处理函数
        function addEvent(options) {
            $('#' + options.wrapperID + '>ul>li').live('click', function (e) {
                e.preventDefault();
                self.fillInputTxt($(this).text());
            }).live('mouseenter',function(){
                $(this).siblings().removeClass('on');
                $(this).addClass('on');
            });
            $('body').bind('click', function () {
                // itemsWrapper.hide().find('.on').removeClass('on');
                self.hideWrapper();
            });
        }
        //获取数据
        function getData(inputObj, e, options) {
            // console.log('runing getData....');
            var val = $.trim(inputObj.val()),
                url = options.url,
                key = options.key,
                keyCode = e.keyCode;
            if ( keyCode === 13 
                || keyCode === 27
                || keyCode === 37
                || keyCode === 38
                || keyCode === 39
                || keyCode === 40 ) {
                return;
            }
            if ( !val ) {
                self.hideWrapper();
                return;
            }

            self.dataCache[self.getUrl()] = self.dataCache[self.getUrl()] || {};
            if (self.dataCache[self.getUrl()][val] !== undefined){ //使用缓存数据
                createHtml( self.dataCache[self.getUrl()][val], inputObj, itemsWrapper, divShim );
            } else{ //请求服务器数据
                $.ajax({
                    type: 'GET',
                    url: url,
                    data: key + '=' + val,
                    dataType: options.isJsonp ? 'jsonp' : 'json',
                    success: function (data) {
                        self.dataCache[self.getUrl()][val] = data;
                        if ( data ) {
                            if ( data.length == 0 ){
                                itemsWrapper.hide();
                                return;
                            }
                            createHtml( data, inputObj, itemsWrapper, divShim );
                        }
                    }
                });
            }
        }
        //生成提示层
        function createHtml(data, elem, itemsWrapper, divShim) {
            var eTop = elem.offset().top+elem.innerHeight(),
                eLeft = elem.offset().left,
                html = '<ul id="">',
                liHTML = '',
                rtext = new RegExp($.trim(elem.val()),"i"),
                newtext = '<b>'+$.trim(elem.val())+'</b>';
            for ( var i = 0, len = data.length; i < len; i++  ) {
                liHTML = data[i].name.replace(rtext, newtext);
                html += '<li>' + liHTML + '</li>';
            }
            html += '</ul>';
            itemsWrapper.html(html).css({
                'width': (conf.wrapperWidth ? conf.wrapperWidth : elem.innerWidth()) - 2*(parseInt(itemsWrapper.css('border-left-width'))) +'px',// 减去2 因为有左右边框
                'position':'absolute',
                'top': eTop+'px',
                'left': eLeft+'px'
            }).show();
            // IE6
            if ( $.browser.msie && $.browser.version == 6.0 ) {
                divShim.css({
                    'width': itemsWrapper.innerWidth() +'px',
                    'height': itemsWrapper.innerHeight()+'px',
                    'top': eTop+'px',
                    'left': eLeft+'px',
                    'margin-top':itemsWrapper.css('margin-top')
                }).show();
            }
            $('body').data('whichInput', elem);
        }
        //
        function initDOMready(options){
            itemsWrapper = itemsWrapper || $('<div class="' + options.defaultWrapperClass + '" id="' + options.wrapperID + '" />').appendTo('body');
            if ( $.browser.msie && $.browser.version == 6.0 ) {
                divShim = divShim || $('<iframe id="' + options.divShim + '" src="" scrolling="no" frameborder="0" />').appendTo('body');
            }
        }
        //初始化输入框
        function initTextInput (options){
            
            self.attr('autocomplete', 'off');
            self.bind('focus',function(){
                if (options.addWrapperClass) {
                    itemsWrapper.attr('className', options.defaultWrapperClass + ' ' + options.addWrapperClass);
                }else{
                    itemsWrapper.attr('className', options.defaultWrapperClass);
                }
            });
            self.bind('keydown', function (e) {
                var keyCode = e.keyCode;
                if (keyCode == 27) {
                    self.hideWrapper();
                    self.stop();
                    return;
                }
                if (keyCode === 40 || keyCode == 38) {
                    self.onSelect( e, itemsWrapper.find('.on') );
                }else{
                    if(!self._isRunning){
                        self.start(e, options);
                    }
                }
            });
            self.bind('blur', function(e){
                 // e.stopPropagation();
                 self.stop();
            });
        }
        function init(options){
            initDOMready(options);
            initTextInput(options);
            if (options.isTriggerFocus) {
                self.trigger('focus');
            }
            if ( !eventStatus ) {
                addEvent(options);
                eventStatus = true;
            }
        }
        init( conf );
        /* 调用回调,参数为当前jq对象*/
        if ( fn ){
            fn.call( window , self );
        }
    }

    $.fn.suggest = function(options, fn){
        var el = this.data("suggest");
        if(el)return;
        if($.isFunction(options)){
            fn = options;
            options = $.extend({}, $.tools.suggest);
        }else {
            options = $.extend({}, $.tools.suggest, options);
        }
        var that = this;
        this.each(function() {
            el = new Suggest($(this),options,fn);
            $(this).data("suggest", el);
        });
        return options.api ? el: this;
    }
})(jQuery);