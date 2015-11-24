/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'bluebird',
    'kb/common/html',
    'kb_service_workspace',
    'datatables_bootstrap'
], function ($, Promise, html, Workspace) {
    'use strict';

    function makeErrorPanel(err) {
        console.log('ERROR');
        console.log(err);
        try {
            return html.makeObjectTable(err, ['type', 'title', 'reason', 'message', 'suggestion']);
        } catch (ex) {
            console.log(ex);
            return 'An unknown error was encountered with this widget, please check the console.';

        }

    }

    function widget(config) {
        var mount, container, runtime = config.runtime,
            tableId;

        function render() {
            return new Promise(function (resolve, reject) {
                var workspace = new Workspace(runtime.getConfig('services.workspace.url'), {
                    token: runtime.service('session').getAuthToken()
                }),
                    a = html.tag('a');
                workspace.list_all_types({
                    with_empty_modules: 1
                })
                    .then(function (data) {
                        // Flatten out the types.
                        var typeRecords = {},
                            getinfo = [];
                        Object.keys(data).forEach(function (moduleName) {
                            // list_all_types above returns a map of module.typeName to the latest version.
                            var types = data[moduleName],
                                typeService = runtime.service('type');
                            Object.keys(types).forEach(function (typeName) {
                                var typeSpec = {
                                        module: moduleName,
                                        name: typeName,
                                        version: types[typeName]
                                    },
                                    type = typeService.makeType(typeSpec),
                                    typeId = typeService.makeTypeId(type);
                                typeRecords[typeId] = {
                                    type: type
                                };

                                //if (typeService.hasType(typeSpec)) {
                                    getinfo.push(Promise.resolve(workspace.get_type_info(typeId)));
                                //}
                            });
                        });
                        return [typeRecords, Promise.all(getinfo)];
                    })
                    .spread(function (typeRecords, results) {
                        results.forEach(function (result) {
                            var typeId = result.type_def;
                            typeRecords[typeId].info = result;
                        });
                        tableId = html.genId();
                        var rows = Object.keys(typeRecords).map(function (typeId) {
                            var typeRecord = typeRecords[typeId];
                            return [
                                typeRecord.type.module, typeRecord.type.name,
                                runtime.service('type').getIcon({
                                    type: typeRecord.type,
                                    size: 'medium'
                                }).html,
                                (function () {
                                    var viewer = runtime.service('type').getViewer({
                                        type: typeRecord.type
                                    });
                                    if (viewer) {
                                        return 'Yes';
                                    }
                                    return '';
                                }()),
                                a({href: '#spec/type/' + typeId}, runtime.service('type').makeVersion(typeRecord.type)),
                                
                                
                                typeRecord.info.using_type_defs.map(function (typeId) {
                                    return a({href: '#spec/type/' + typeId}, typeId);
                                }).join('<br>'),
                                
                                typeRecord.info.used_type_defs.map(function (typeId) {
                                    return a({href: '#spec/type/' + typeId}, typeId);
                                }).join('<br>'),
                                
                                typeRecord.info.using_func_defs.map(function (functionId) {
                                    return a({href: '#spec/functions/' + functionId}, functionId);
                                }).join('<br>'),
                                
                                a({href: '#databrowser?type=' + typeId}, 'browse')

                            ];
                        }),
                            cols = ['Module', 'Type', 'Icon', 'Viewer?', 'Version', 'Using types', 'Used by types', 'Used by functions', 'Objects'],
                            result = html.makeTable({columns: cols, rows: rows, id: tableId, class: 'table table-striped'});
                        resolve({
                            title: 'Type Browser',
                            content: result,
                            children: []
                        });
                    })
                    .catch(function (err) {
                        console.log('ERROR getting type info');
                        console.log(err);
                        reject({
                            type: 'UnkownError',
                            reason: 'Unknown',
                            message: 'Error getting type info'
                        });
                    });
            });
        }

        function attachDatatable() {
            $('#' + tableId).dataTable({
                initComplete: function (settings) {
                    var api = this.api(),
                        rowCount = api.data().length,
                        pageSize = api.page.len(),
                        wrapper = api.settings()[0].nTableWrapper;
                    if (rowCount <= pageSize) {
                        $(wrapper).find('.dataTables_paginate').closest('.row').hide();
                        $(wrapper).find('.dataTables_filter').closest('.row').hide();
                    }
                    $(settings.nTable).removeClass('hide');
                }
            });
        }

        // API
        function attach(node) {
            return Promise.try(function () {
                mount = node;
                container = document.createElement('div');
                mount.appendChild(container);
                container.innerHTML = 'Loading all KBase Types from the Workspace Service ...' + html.loading();
            });
        }

        function run() {
            return render()
                .then(function (rendered) {
                    container.innerHTML = rendered.content;
                    runtime.send('ui', 'setTitle', rendered.title);
                    attachDatatable();
                })
                .catch(function (err) {
                    console.log('ERR?');
                    container.innerHTML = makeErrorPanel(err);
                    // console.log(err);
                    //  container.innerHTML = 'Error rendering this widget, check the console.';
                });
        }

        function detach() {
            mount.removeChild(container);
            container.innerHTML = '';
            container = null;
        }
        return {
            attach: attach,
            run: run,
            detach: detach
        };
    }

    return {
        make: function (config) {
            return widget(config);
        }
    };

});