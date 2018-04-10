/*!
 * Copyright 2016
 *
 * `XM` 用于封装前端抽象代码，便于代码复用
 *
 * @author Jake <singviy@gmail.com>
 * @date 2017-08-11 13:55:53
 *
 */
(function ($) {
    var XM = {

        /**
         * API 接口前缀
         */
        API_PREFIX: 'index.php?r=',

        /**
         * 默认field值
         *
         * @see XM.setSelectorValue
         */
        DEFAULT_FIELD_VALUE: '--',

        /**
         *  将数据打包成payload对象
         *
         * @param obj
         * @returns {{payload}}
         */
        payload: function (obj) {
            return { payload: JSON.stringify(obj) };
        },

        /**
         * 判断是否为空对象
         * @param obj
         */
        isEmptyObj: function (obj) {
            return JSON.stringify(obj) === '{}' || JSON.stringify(obj) === '[]';
        },

        /**
         * 发送一个post请求(站内请求)
         *
         * @param uri
         * @param data 接口数据，如果没有进行payload打包，这里会进行打包
         * @param cbSuccess 接口返回成功，则传递result.data给cbSuccess
         * @param cbError 接口返回失败，则传递失败result.message给cbError
         * @returns {*}
         */
        post: function (uri, data, cbSuccess, cbError) {
            if (!data.hasOwnProperty('payload')) {
                data = XM.payload(data);
            }

            if (uri.indexOf(XM.API_PREFIX) < 0) {
                uri = XM.API_PREFIX + uri;
            }

            return $.ajax({
                type: 'POST',
                url: uri,
                data: data,
                success: function (result) {
                    if (result.code * 1 === 1) {
                        cbSuccess(result.data);
                    } else if (cbError) {
                        cbError(result.message);
                    }
                }
            });
        },

        /**
         * 发送一个异步请求, 如果参数callback不返回false,
         * 则对接口返回数据进行渲染(XM.initApiData)
         *
         * @param uri
         * @param data
         * @param callback
         * @param cbError
         * @returns {*}
         */
        sendRequest: function (uri, data, callback, cbError) {
            return XM.post(uri, data, function (data) {
                if (callback) {
                    var res = callback(data);
                }

                if (res !== false) {
                    XM.initApiData(data);
                }
            }, cbError);
        },

        /**
         * 数据初始化，将参数`data`渲染到页面中的data-field元素中
         *
         * @param $container
         * @param data
         * @param previousKey
         */
        initApiData: function ($container, data, previousKey) {
            //alert(previousKey);
            var argLength = arguments.length;

            if (argLength == 1) {
                data = $container;
                $container = previousKey = null;
            }

            if (argLength === 2) {
                previousKey = data;
                data = $container;
                $container = null;
            }

            if (XM.isEmptyObj(data)) {
                return false;
            }

            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (typeof data[key] === 'object') {

                        if (data[key] == null || XM.isEmptyObj(data[key])) {
                            key = previousKey ? previousKey + '.' + key : key;
                            if ($container) {
                                var $nodes = $container.find('[data-field^="'+ key +'"]');
                            } else {
                                $nodes = $('[data-field^="'+ key +'"]');
                            }

                            XM.setSelectorValue($nodes, '');
                            continue;
                        }

                        if ($container) {
                            XM.initApiData($container, data[key], previousKey ? previousKey + '.' + key : key);
                        } else {
                            XM.initApiData(data[key], previousKey ? previousKey + '.' + key : key);
                        }

                        continue;
                    }

                    var currentKey = key;
                    key = previousKey ? previousKey + '.' + key : key;

                    if ($container) {
                        //console.log(key, data[currentKey]);
                        XM.setField($container, key, data[currentKey]);
                    } else {
                        XM.setField(key, data[currentKey]);
                    }
                }
            }

        },

        /**
         * 界面初始化，这里定义了该页面需要请求的所有接口
         *
         * @param apis 一个二维数组，它的每一个元素是一个三元数组：
         *   0: api的地址
         *   1: api携带的数据
         *   2: 回调函数，接收一个参数，这个参数是api接口的返回值中的data字段，如果这个函数返回false，
         *      则该回调函数执行后不会执行其他事情（如渲染界面中的data-field元素）
         */
        initApi: function (apis) {
            for (var key in apis) {
                if (apis.hasOwnProperty(key)) {
                    if (sr) {
                        sr = sr.then(XM.sendRequest.apply(null, apis[key]))
                    } else {
                        var sr = XM.sendRequest.apply(null, apis[key])
                    }
                }
            }

            sr.done(function () {});
        },

        /**
         *
         * @param html
         * @param data
         * @returns {jQuery|HTMLElement|*}
         */
        initTemplate: function(html, data) {
            $('body .xmTmpNode').remove();
            $('body').append('<div class="xmTempNode hide"></div>');
            var $tmpNode = $('.xmTempNode');
            $tmpNode.html(html);

            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key] instanceof Array) {
                        XM.setList(key, data[key], $tmpNode);
                    } else {
                        XM.initApiData($tmpNode, data[key], key);
                    }
                    // todo 还有直接取值的情况需要考虑
                }
            }

            var resHtml = $tmpNode.html();
            $tmpNode.remove();

            return resHtml;
        },

        /**
         * 根据field名称设置值
         *
         * 优化，根据标签做不同的赋值处理，如，input，textarea，select需要不同的赋值
         *
         * @param $container 指定容器内的字段才会变化
         * @param field
         * @param value
         */
        setField: function ($container, field, value) {
            var argLength = arguments.length;

            if (argLength === 2) {
                value = field;
                field = $container;
                $container = null;
            }

            if (field instanceof Array) {
                field.forEach(function (t) {
                    if (argLength === 3) {
                        $field = $container.find('[data-field="'+t+'"]');
                    } else {
                        var $field = $('[data-field="'+t+'"]');
                    }

                    XM.setSelectorValue($field, value);
                });
            } else {
                if ($container) {
                    XM.setSelectorValue($container.find('[data-field="'+field+'"]'), value);
                } else {
                    XM.setSelectorValue($('[data-field="'+field+'"]'), value);
                }
            }

            return XM;
        },

        /**
         * 根据选择器标签类型获取该标签的值
         *
         * FIXME 需要完善更多的标签类型
         */
        getSelectorValue: function($selector) {
            var tagName = $selector.prop('tagName');
            tagName = tagName.toLowerCase();

            // var tagType = $selector.attr('type') || '';
            // tagType = tagType.toLowerCase();

            // select
            if (tagName === 'select' || tagName === 'input') {
                return $selector.val();
            }

            if(tagName === 'img') {
                return $selector.attr('src');
            }

            return $selector.val();
        },

        /**
         *  给节点设置值
         * @param $selector
         * @param value
         */
        setSelectorValue: function ($selector, value) {
            $selector.each(function () {
                var tagName = $(this).prop('tagName');
                tagName = tagName.toLowerCase();

                var tagType = $(this).attr('type') || '';
                tagType = tagType.toLowerCase();

                // select
                if (tagName === 'select') {
                    if (value == '' || value == XM.DEFAULT_FIELD_VALUE) {
                        var $option = $(this).find('option').eq(0);

                        $option.attr('selected', true);
                        $option.siblings().removeAttr('selected');

                        return ;
                    }

                    $(this).val(value);
                    return ;
                }

                // textarea
                if (tagName === 'textarea') {
                    $(this).text(value === XM.DEFAULT_FIELD_VALUE ? '' : value);
                    return ;
                }

                // input radio
                if (tagName === 'input' && tagType === 'radio') {
                    if ($(this).val() == value) {
                        $(this).prop('checked', true);
                        return ;
                    }

                    if (value.length <= 0 || value === XM.DEFAULT_FIELD_VALUE) {
                        $(this).prop('checked', false);
                        return ;
                    }
                }

                //input text
                if (tagName === 'input') {
                    $(this).val(value === XM.DEFAULT_FIELD_VALUE ? '' : value);
                    return ;
                }

                // img src
                if (tagName === 'img') {
                    if (value && value !== XM.DEFAULT_FIELD_VALUE) {
                        $(this).attr('data-origin-src') || $(this).attr('data-origin-src', $(this).attr('src'));
                        $(this).attr('src', value);
                    } else if ($(this).attr('data-origin-src')){
                        $(this).attr('src', $(this).attr('data-origin-src') || '');
                    }

                    return ;
                }

                // html
                if (!value || value.length <= 0) {
                    $(this).text('--');
                } else {
                    $(this).text(value);
                }
            });
        },

        /**
         * 为某区域的data-field设置默认值
         */
        setDefaultField: function ($container, defaultValue) {
            var $fields = $container.find('[data-field]');
            XM.setSelectorValue($fields, defaultValue || '');
        },

        /**
         * 设置列表数据
         *
         * 一个列表是拥有data-list的节点, 列表一般（目前）有两种，一种是table类型，一种是ul类型
         *
         * todo ul类型需要补充
         *
         * @param listName
         * @param data
         * @param $container
         */
        setList: function (listName, data, $container) {
            var $oneItem = null;

            if ($container) {
                $oneItem = $container.find('[data-list="'+listName+'"]');
            } else {
                $oneItem = $('[data-list="'+listName+'"]');
            }

            // 一个页面可能存在多个list
            $oneItem.each(function () {
                var $listContainer = $(this).parent();

                var $tableHeader = $(this).siblings().eq(0);
                var $puppet = $(this).clone(); // puppet: 傀儡
                $puppet.show();

                $listContainer.empty();
                // 2018-01-19 17:33:26 fix: 检查是否存在表头
                if (!$tableHeader.attr('data-list')) {
                  $listContainer.append($tableHeader);
                }
                var listData = data;
                for (var key in listData) {
                    if (listData.hasOwnProperty(key)) {
                        var itemData = listData[key];

                        var $items = $puppet.find('[data-item]');

                        $items.each(function () {
                            var itemKey = $(this).attr('data-item');
                            if (itemData.hasOwnProperty(itemKey)) {
                                XM.setSelectorValue($(this), itemData[itemKey]);
                            }
                        });
                    }

                    $listContainer.append($puppet);

                    $puppet = $puppet.clone();
                }

                if ($listContainer.find('[data-list]').length <= 0) {
                    $puppet.hide();
                    $listContainer.append($puppet);
                }

                $puppet = null;
            });
        },

        /**
         * 获取列表数据
         *
         * @param selector
         * @param listName
         */
        getListData: function(selector, listName) {
            var $list = selector.find('[data-list="'+listName+'"]');
            var listData = [];

            function nodeValue($selector) {
                var tagName = $selector.prop('tagName');
                tagName = tagName.toLowerCase();

                if (tagName === 'input') {
                    return $selector.val();
                } else {
                    return $selector.text();
                }
            }

            $list.each(function () {

                if (!$(this).is(':visible')) {
                    return ;
                }

                var $items = $(this).find('[data-item]');

                var itemData = {};

                $items.each(function () {
                    var key = $(this).attr('data-item');
                    itemData[key] = nodeValue($(this));
                });

                listData.push(itemData);
            });

            return listData;
        },

        /**
         * 异步表单提交
         *
         * 表单提交成功时会自动替换与form表单元素有相同data-field的元素的数据
         *
         * @param form 需要提交的表单的selector, 你需要确保该selector能唯一定位你需要提交的表单
         *             因此，多表单页面勿使用 'form' 标签选择器
         * @param callback 回调函数, 该函数可以接收两个参数，一个是请求数据，一个是返回数据
         * @param handlePayload 在发送请求前对数据进行处理
         */
        postForm: function (form, callback, handlePayload) {
            var data = form.serialize();
            data = data.split('&');
            var requestData = {};

            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var params = decodeURIComponent(data[key]);

                    var item = params.split('=');
                    if (item.length === 2) {
                        /**
                         * 解析数组结构 如 contacts[0][name], contacts[0][tel]
                         * TODO 目前只考虑二维数组，暂不支持多维数组！
                         */
                        if (item[0].indexOf('[') >=0 ) {
                            var groupKey = item[0];
                            var groupKeyHead = groupKey.split('[')[0];

                            if (!requestData.hasOwnProperty(groupKeyHead)) {
                                requestData[groupKeyHead] = [];
                            }

                            var matches = groupKey.match(/\[(.*?)\]/g);
                            matches = matches.map(function (item) {
                               return item.replace('[', '').replace(']', '');
                            });

                            var index = matches[0];
                            var subKey = matches[1];

                            if (!requestData[groupKeyHead].hasOwnProperty(index)) {
                                requestData[groupKeyHead][index] = {};
                            }

                            requestData[groupKeyHead][index][subKey] = $.trim(item[1]);
                        } else {
                            requestData[item[0]] = $.trim(item[1].toString().replace(/\+/g, ' '));
                        }
                    }
                }
            }


            if (handlePayload) {
                requestData = handlePayload(requestData);

                // handlePayload 返回false时中断请求
                if (requestData === false) {
                    return ;
                }
            }

            XM.post(form.attr('action'), requestData, function (data) {
                var fields = form.find('[data-field]');

                fields.each(function () {
                    var $this = $(this),
                        fieldName = $this.attr('data-field');

                    XM.setField(fieldName, XM.getSelectorValue($this));
                });

                if (callback) {
                    callback(requestData, data);
                }
            }, function (message) {
                infoFrame(1, message);
            });
        },

        /**
         * 勾选一个radio(并且取消其他兄弟radio的勾选)
         *
         * @param name radio的name属性值
         * @param value 所需要勾选的radio的value
         */
        checkRadio: function (name, value) {
            var $radio = $('[name="'+name+'"]');

            $radio.each(function () {
                $(this).prop('checked', value == $(this).val());
            })

        }
    };

    window.XM = XM;
})($);
