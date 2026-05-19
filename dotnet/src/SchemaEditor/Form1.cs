using Microsoft.Web.WebView2.WinForms;
using System.Data.ModelDescription;

namespace SchemaEditor {
  public partial class Form1 : Form {
    public Form1() {
      InitializeComponent();
      toolStrip1.Renderer = new ModernToolStripRenderer();

      toolStripLabelFilePath.Text = SchemaEditor.SchemaJsonFilePath;

      WebView2 myWebView = webView;
      myWebView.CoreWebView2InitializationCompleted += (s, e) => {
        if (e.IsSuccess) {
          myWebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        }
      };
    }

    private void CoreWebView2_WebMessageReceived(object? sender,
      Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e) {
      string message = e.TryGetWebMessageAsString();

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

    private void toolStripButtonCodeToJson_Click(object sender, EventArgs e) {
      SchemaEditor.GenerateCodeFromJson();
    }

    private void toolStripButtonCode2Json_Click(object sender, EventArgs e) {
      SchemaEditor.GenerateJsonFromCode();
    }

    // -------------------------------------------------------------------------
    // Custom renderer — dark VS-style toolbar
    // -------------------------------------------------------------------------

    private class ModernToolStripRenderer : ToolStripProfessionalRenderer {
      private static readonly Color BgColor        = Color.FromArgb(37,  37,  38);
      private static readonly Color HoverColor     = Color.FromArgb(62,  62,  66);
      private static readonly Color PressedColor   = Color.FromArgb(14,  99, 156);
      private static readonly Color PressedBorder  = Color.FromArgb(0,  122, 204);
      private static readonly Color NormalText     = Color.FromArgb(204, 204, 204);
      private static readonly Color FilePathText   = Color.FromArgb(156, 220, 254);
      private static readonly Color SeparatorColor = Color.FromArgb(80,  80,  80);

      public ModernToolStripRenderer() : base(new ModernColorTable()) { }

      protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e) {
        using var brush = new SolidBrush(BgColor);
        e.Graphics.FillRectangle(brush, e.AffectedBounds);
      }

      protected override void OnRenderButtonBackground(ToolStripItemRenderEventArgs e) {
        var g    = e.Graphics;
        var rect = new Rectangle(1, 3, e.Item.Width - 2, e.Item.Height - 6);

        if (e.Item.Pressed) {
          using var fill   = new SolidBrush(PressedColor);
          using var border = new Pen(PressedBorder);
          g.FillRectangle(fill,   rect);
          g.DrawRectangle(border, rect);
        } else if (e.Item.Selected) {
          using var fill = new SolidBrush(HoverColor);
          g.FillRectangle(fill, rect);
        }
      }

      protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e) {
        e.TextColor = e.Item is ToolStripLabel ? FilePathText : NormalText;
        base.OnRenderItemText(e);
      }

      protected override void OnRenderSeparator(ToolStripSeparatorRenderEventArgs e) {
        int x = e.Item.Width / 2;
        using var pen = new Pen(SeparatorColor);
        e.Graphics.DrawLine(pen, x, 8, x, e.Item.Height - 8);
      }

      protected override void OnRenderGrip(ToolStripGripRenderEventArgs e) { }

      protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e) { }

      protected override void OnRenderLabelBackground(ToolStripItemRenderEventArgs e) { }
    }

    private class ModernColorTable : ProfessionalColorTable {
      private static readonly Color Bg = Color.FromArgb(37, 37, 38);
      public override Color ToolStripBorder => Bg;
      public override Color MenuBorder      => Bg;
    }
  }
}
