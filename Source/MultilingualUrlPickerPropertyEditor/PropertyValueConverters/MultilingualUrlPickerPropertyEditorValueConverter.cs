using System;
using System.Collections.Generic;
using System.Linq;
using MultilingualUrlPickerPropertyEditor.Models;
using Newtonsoft.Json;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;
using ConfigConstants = MultilingualUrlPickerPropertyEditor.Constants.PropertyEditors.MultilingualUrlPickerPropertyEditor.Configuration;

namespace MultilingualUrlPickerPropertyEditor.PropertyValueConverters
{
    public class MultilingualUrlPickerPropertyEditorValueConverter : PropertyValueConverterBase
    {
        public override bool IsConverter(IPublishedPropertyType propertyType) => propertyType.EditorAlias.Equals(Constants.PropertyEditors.MultilingualUrlPickerPropertyEditor.Alias);
        
        public override bool? IsValue(object value, PropertyValueLevel level) => value?.ToString() != "[]";

        public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
        {
            var configuration = propertyType.DataType.Configuration as Dictionary<string, object>;
            var maxNumber = Convert.ToInt32(configuration[ConfigConstants.MaxNumber]);

            return maxNumber == 1
                ? typeof(MultilingualUrlPickerItem)
                : typeof(IEnumerable<MultilingualUrlPickerItem>);
        }

        public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType) => PropertyCacheLevel.Snapshot;

        public override object ConvertSourceToIntermediate(IPublishedElement owner, IPublishedPropertyType propertyType, object source, bool preview) => source?.ToString();

        public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
        {
            var configuration = propertyType.DataType.Configuration as Dictionary<string, object>;
            var maxNumber = Convert.ToInt32(configuration[ConfigConstants.MaxNumber]);

            if (inter == null)
            {
                return maxNumber == 1 ? null : Enumerable.Empty<MultilingualUrlPickerItem>();
            }

            var links = JsonConvert.DeserializeObject<IEnumerable<MultilingualUrlPickerItem>>(inter.ToString());

            if (maxNumber == 1) return links.FirstOrDefault();
            if (maxNumber > 0) return links.Take(maxNumber);
            return links;
        }
    }
}
