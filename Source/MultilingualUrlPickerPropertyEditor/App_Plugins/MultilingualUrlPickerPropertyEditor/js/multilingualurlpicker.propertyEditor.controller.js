angular.module("umbraco").controller("MultilingualUrlPickerController.PropertyEditor",
    function ( $scope,
    angularHelper,
    localizationService,
    entityResource,
    iconHelper,
    editorService) {


    var vm = this;
    vm.openLinkPicker = openLinkPicker;

    $scope.renderModel = [];

    if ($scope.preview) {
        return;
    }

    if (!Array.isArray($scope.model.value)) {
        $scope.model.value = [];
    }

    var currentForm = angularHelper.getCurrentForm($scope);
    $scope.sortableOptions = {
        distance: 10,
        tolerance: 'pointer',
        scroll: true,
        zIndex: 6000,
        update: function update() {
            currentForm.$setDirty();
        }
    };

    $scope.model.value.forEach(function (link) {
        link.icon = iconHelper.convertFromLegacyIcon(link.icon);
        $scope.renderModel.push(link);
    });

    $scope.$on('formSubmitting', function () {
        $scope.model.value = $scope.renderModel;
    });

    $scope.remove = function ($index) {
        $scope.renderModel.splice($index, 1);
        currentForm.$setDirty();
    };

    $scope.$watch(
        function () {
            return $scope.renderModel.length;
        },
        function () {
            if ($scope.model.config && $scope.model.config.minNumber) {
                $scope.multiUrlPickerForm.minCount.$setValidity(
                    "minCount",
                    +$scope.model.config.minNumber <= $scope.renderModel.length
                );
            }
            if ($scope.model.config && $scope.model.config.maxNumber) {
                $scope.multiUrlPickerForm.maxCount.$setValidity(
                    "maxCount",
                    +$scope.model.config.maxNumber >= $scope.renderModel.length
                );
            }
            $scope.sortableOptions.disabled = $scope.renderModel.length === 1;
        }
        );

    function init() {
        localizationService.localizeMany(['general_recycleBin']).then(function (data) {
            vm.labels.general_recycleBin = data[0];
        });
        // if the property is mandatory, set the minCount config to 1 (unless of course it is set to something already),
        // that way the minCount/maxCount validation handles the mandatory as well
        if ($scope.model.validation && $scope.model.validation.mandatory && !$scope.model.config.minNumber) {
            $scope.model.config.minNumber = 1;
        }
    }


    function openLinkPicker(link, $index) {
        var target = link ? {
            id: link.id,
            name: link.name,
            anchor: link.queryString,
            udi: link.udi,
            url: link.url,
            target: link.target,
            culture: link.culture
        } : null;

        var linkpicker = {
            currentTarget: target,
            view: "/App_Plugins/MultilingualUrlPickerPropertyEditor/multilingualurlpicker.picker.html",
            title: "Multilingual Url Picker",
            size: "small",
            submit: function (model) {
                if (model.target.url || model.target.anchor) {
                    // if an anchor exists, check that it is appropriately prefixed
                    if (model.target.anchor &&
                        model.target.anchor[0] !== '?' &&
                        model.target.anchor[0] !== '#') {
                        model.target.anchor = (model.target.anchor.indexOf('=') === -1 ? '#' : '?') +
                            model.target.anchor;
                    }
                    if (link) {
                        link.id = model.target.id;
                        link.udi = model.target.udi;
                        link.name = model.target.name || model.target.url || model.target.anchor;
                        link.queryString = model.target.anchor;
                        link.target = model.target.target;
                        link.url = model.target.url;
                        link.culture = model.target.culture;
                    } else {
                        link = {
                            id: model.target.id,
                            name: model.target.name || model.target.url || model.target.anchor,
                            queryString: model.target.anchor,
                            target: model.target.target,
                            udi: model.target.udi,
                            url: model.target.url,
                            culture: model.target.culture
                        };
                        $scope.renderModel.push(link);
                    }
                    if (link.udi) {
                        var entityType = 'Document';
                        entityResource.getById(link.udi, entityType).then(function (data) {
                            link.icon = iconHelper.convertFromLegacyIcon(data.icon);
                            link.published =
                                data.metaData &&
                                    data.metaData.IsPublished === false &&
                                    entityType === 'Document'
                                    ? false
                                    : true;
                            link.trashed = data.trashed;
                            if (link.trashed) {
                                item.url = vm.labels.general_recycleBin;
                            }
                        });
                    } else {
                        link.icon = 'icon-link';
                        link.published = true;
                    }
                    currentForm.$setDirty();
                }
                editorService.close();
            },
            close: function () {
                editorService.close();
            }
        };

        editorService.open(linkpicker);
    }
    });