angular.module('umbraco').controller('MultilingualUrlPickerController.Picker', function (
    $scope,
    eventsService,
    entityResource,
    mediaResource,
    udiParser,
    localizationService,
    languageResource,
    $cookies,
    $location) {

    var vm = this;
    var dialogOptions = $scope.model;
    vm.submit = submit;
    vm.close = close;
    vm.toggleOpenInNewWindow = toggleOpenInNewWindow;
    vm.labels = {};
    vm.languages = [];
    vm.selectedLanguage = {};
    vm.languageSelectorIsOpen = false;
    vm.showLanguageSelector = $scope.model.showLanguageSelector;
    vm.toggleLanguageSelector = toggleLanguageSelector;
    vm.selectLanguage = selectLanguage;
    vm.showTree = false;

    console.log($scope.model);

    var defaultCulture = $cookies.get('UMB_MCULTURE');

    if (!defaultCulture) {
        defaultCulture = $location.search().mculture;
    }


    // load languages
    languageResource.getAll().then(function (languages) {
        vm.languages = languages;
        // set the default language
        vm.languages.forEach(function (language) {
            console.log(language.culture, defaultCulture);
            if (language.culture === defaultCulture) {
                vm.selectedLanguage = language;
                vm.languageSelectorIsOpen = false;
            }
        });

        initPicker();
        
        $scope.customTreeParams = $scope.customTreeParams.length > 0
            ? $scope.customTreeParams + '&culture=' + vm.selectedLanguage.culture
            : 'culture=' + vm.selectedLanguage.culture;
        vm.showTree = true;
    });

    localizationService.localizeMany(['defaultdialogs_openInNewWindow']).then(function (data) {
        vm.labels.openInNewWindow = data[0];
    });

    if (!$scope.model.title) {
        localizationService.localize('defaultdialogs_selectLink').then(function (value) {
            $scope.model.title = value;
        });
    }

    
    $scope.customTreeParams = '';
    $scope.dialogTreeApi = {};
    $scope.model.target = {};
    $scope.showTarget = $scope.model.hideTarget !== true;

    // this ensures that we only sync the tree once and only when it's ready
    var oneTimeTreeSync = {
        executed: false,
        treeReady: false,
        sync: function sync() {
            // don't run this if:
            // - it was already run once
            // - the tree isn't ready yet
            // - the model path hasn't been loaded yet
            if (this.executed || !this.treeReady || !($scope.model.target && $scope.model.target.path)) {
                return;
            }
            this.executed = true;
            // sync the tree to the model path
            $scope.dialogTreeApi.syncTree({
                path: $scope.model.target.path,
                tree: 'content'
            });
        }
    };

    function initPicker() {
        if (dialogOptions.currentTarget) {
            // clone the current target so we don't accidentally update the caller's model while manipulating $scope.model.target
            $scope.model.target = angular.copy(dialogOptions.currentTarget);
            // if we have a node ID, we fetch the current node to build the form data
            if ($scope.model.target.culture && $scope.model.target.culture.length) {
                console.log('languages ', vm.languages);
                vm.languages.forEach(function (language) {
                    console.log('lang ', language.culture, $scope.model.target.culture);
                    if (language.culture === $scope.model.target.culture) {
                        vm.selectedLanguage = language;
                    }
                });
            }

            if ($scope.model.target.id || $scope.model.target.udi) {
                // will be either a udi or an int
                var id = $scope.model.target.udi ? $scope.model.target.udi : $scope.model.target.id;

                entityResource.getPath(id, 'Document').then(function (path) {
                    $scope.model.target.path = path;
                    oneTimeTreeSync.sync();
                });
                entityResource.getUrlAndAnchors(id).then(function (resp) {
                    $scope.anchorValues = resp.anchorValues;
                    $scope.model.target.url = resp.url;
                });

                entityResource.getUrl($scope.model.target.id, 'Document', $scope.model.target.culture).then(function (resp) {
                    console.log(resp);
                    $scope.model.target.url = resp;
                });

            } else if ($scope.model.target.url && $scope.model.target.url.length) {
                // a url but no id/udi indicates an external link - trim the url to remove the anchor/qs
                // only do the substring if there's a # or a ?
                var indexOfAnchor = $scope.model.target.url.search(/(#|\?)/);
                if (indexOfAnchor > -1) {
                    // populate the anchor
                    $scope.model.target.anchor = $scope.model.target.url.substring(indexOfAnchor);
                    // then rewrite the model and populate the link
                    $scope.model.target.url = $scope.model.target.url.substring(0, indexOfAnchor);
                }
            }
            // need to translate the link target ("_blank" or "") into a boolean value for umb-checkbox
            vm.openInNewWindow = $scope.model.target.target === '_blank';
        } else if (dialogOptions.anchors) {
            $scope.anchorValues = dialogOptions.anchors;
        }
    }

    function selectLanguage(language) {
        vm.selectedLanguage = language;
        // close the language selector
        vm.languageSelectorIsOpen = false;
        $scope.dialogTreeApi.load({
            section: 'content',
            customTreeParams: 'culture=' + vm.selectedLanguage.culture
        });
    }

    function toggleLanguageSelector() {
        vm.languageSelectorIsOpen = !vm.languageSelectorIsOpen;
    }

    function treeLoadedHandler(args) {
        oneTimeTreeSync.treeReady = true;
        oneTimeTreeSync.sync();
    }
    function nodeSelectHandler(args) {
        if (args && args.event) {
            args.event.preventDefault();
            args.event.stopPropagation();
        }
        eventsService.emit('dialogs.linkPicker.select', args);
        if ($scope.currentNode) {
            //un-select if there's a current one selected
            $scope.currentNode.selected = false;
        }

        $scope.currentNode = args.node;
        $scope.currentNode.selected = true;
        $scope.model.target.id = args.node.id;
        $scope.model.target.udi = args.node.udi;
        $scope.model.target.name = args.node.name;
        $scope.model.target.culture = args.node.metaData.culture;

        if (args.node.id < 0) {
            $scope.model.target.url = '/';
        } else {
            entityResource.getUrlAndAnchors(args.node.id).then(function (resp) {
                $scope.anchorValues = resp.anchorValues;
            });
            entityResource.getUrl(args.node.id, 'Document', vm.selectedLanguage.culture).then(function(resp) {
                $scope.model.target.url = resp;
            });
        }
    }
    function nodeExpandedHandler(args) {
        // open mini list view for list views
        if (args.node.metaData.isContainer) {
            openMiniListView(args.node);
        }
    }

    $scope.onTreeInit = function () {
        $scope.dialogTreeApi.callbacks.treeLoaded(treeLoadedHandler);
        $scope.dialogTreeApi.callbacks.treeNodeSelect(nodeSelectHandler);
        $scope.dialogTreeApi.callbacks.treeNodeExpanded(nodeExpandedHandler);
    };
    // Mini list view
    $scope.selectListViewNode = function (node) {
        node.selected = node.selected === true ? false : true;
        nodeSelectHandler({ node: node });
    };
    $scope.closeMiniListView = function () {
        $scope.miniListView = undefined;
    };
    function openMiniListView(node) {
        $scope.miniListView = node;
    }
    function toggleOpenInNewWindow(model, value) {
        $scope.model.target.target = model ? '_blank' : '';
    }
    function close() {
        if ($scope.model && $scope.model.close) {
            $scope.model.close();
        }
    }
    function submit() {
        if ($scope.model && $scope.model.submit) {
            $scope.model.submit($scope.model);
        }
    }
});