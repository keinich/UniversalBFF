using Microsoft.Web.WebView2.WinForms;
using System.Data.ModelDescription;

namespace SchemaEditor {
  public partial class Form1 : Form {
    public Form1() {
      InitializeComponent();

      toolStripLabelFilePath.Text = SchemaEditor.SchemaJsonFilePath;

      WebView2 myWebView = webView;
      myWebView.CoreWebView2InitializationCompleted += (s, e) => {
        if (e.IsSuccess) {
          // Listen for messages from JavaScript
          myWebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        }
      };
    }

    private void CoreWebView2_WebMessageReceived(object? sender,
      Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e) {
      // Get the message from JavaScript
      string message = e.TryGetWebMessageAsString();

      // React to the message
      //MessageBox.Show($"Received from JavaScript: {message}");



      // For JSON messages, you can deserialize:
      JsMessage? data = System.Text.Json.JsonSerializer.Deserialize<JsMessage>(message);

      if (data == null) {
        MessageBox.Show("Failed to deserialize message.");
        return;
      }

      switch (data.action) {
        case "showAlert":
          MessageBox.Show($"Alert from JavaScript: {data.dataJson}");
          break;
        case "save":
          // Handle saving data
          SchemaEditor.SaveSchema(data.dataJson);
          break;
        default:
          MessageBox.Show($"Unknown action: {data.action}");
          break;
      }

    }

    private void toolStripButtonLoadSchema_Click(object sender, EventArgs e) {
      string schemaJson = SchemaEditor.LoadSchemaJson();
      webView.CoreWebView2.PostWebMessageAsString(schemaJson);
    }
  }
}
