using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchemaEditor {
  public class JsMessage {
    public string action { get; set; } = string.Empty;
    public string dataJson { get; set; } = string.Empty;
    //public JsMessage(string action, string dataJson) {
    //  Action = action;
    //  DataJson = dataJson;
    //}
  }
}
