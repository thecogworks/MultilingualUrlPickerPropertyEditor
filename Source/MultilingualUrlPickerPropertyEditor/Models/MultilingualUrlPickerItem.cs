using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MultilingualUrlPickerPropertyEditor.Models
{
    public class MultilingualUrlPickerItem
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Udi { get; set; }
        public string Url { get; set; }
        public string Culture { get; set; }
        public string Anchor { get; set; }

    }
}
