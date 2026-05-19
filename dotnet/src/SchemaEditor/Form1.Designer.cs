namespace SchemaEditor {
    partial class Form1 {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing) {
            if (disposing && (components != null)) {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        private void InitializeComponent() {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            webView = new Microsoft.Web.WebView2.WinForms.WebView2();
            panel1 = new Panel();
            toolStrip1 = new ToolStrip();
            toolStripButtonWrite = new ToolStripButton();
            toolStripButtonCode2Json = new ToolStripButton();
            toolStripSeparator1 = new ToolStripSeparator();
            toolStripButtonLoadSchema = new ToolStripButton();
            toolStripLabelFilePath = new ToolStripLabel();
            panel2 = new Panel();
            ((System.ComponentModel.ISupportInitialize)webView).BeginInit();
            panel1.SuspendLayout();
            toolStrip1.SuspendLayout();
            panel2.SuspendLayout();
            SuspendLayout();
            //
            // webView
            //
            webView.AllowExternalDrop = true;
            webView.CreationProperties = null;
            webView.DefaultBackgroundColor = Color.White;
            webView.Dock = DockStyle.Fill;
            webView.Location = new Point(0, 0);
            webView.Name = "webView";
            webView.Size = new Size(1121, 621);
            webView.Source = new Uri("http://localhost:3000/", UriKind.Absolute);
            webView.TabIndex = 0;
            webView.ZoomFactor = 1D;
            //
            // panel1
            //
            panel1.BackColor = Color.FromArgb(37, 37, 38);
            panel1.Controls.Add(toolStrip1);
            panel1.Dock = DockStyle.Top;
            panel1.Location = new Point(0, 0);
            panel1.Name = "panel1";
            panel1.Size = new Size(1121, 40);
            panel1.TabIndex = 1;
            //
            // toolStrip1
            //
            toolStrip1.BackColor = Color.FromArgb(37, 37, 38);
            toolStrip1.Dock = DockStyle.Fill;
            toolStrip1.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            toolStrip1.GripStyle = ToolStripGripStyle.Hidden;
            toolStrip1.ImageScalingSize = new Size(16, 16);
            toolStrip1.Items.AddRange(new ToolStripItem[] {
                toolStripButtonWrite,
                toolStripButtonCode2Json,
                toolStripSeparator1,
                toolStripButtonLoadSchema,
                toolStripLabelFilePath
            });
            toolStrip1.Location = new Point(0, 0);
            toolStrip1.Name = "toolStrip1";
            toolStrip1.Padding = new Padding(6, 0, 0, 0);
            toolStrip1.Size = new Size(1121, 40);
            toolStrip1.TabIndex = 0;
            toolStrip1.Text = "toolStrip1";
            //
            // toolStripButtonWrite
            //
            toolStripButtonWrite.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonWrite.Image = (Image)resources.GetObject("toolStripButtonWrite.Image");
            toolStripButtonWrite.ImageTransparentColor = Color.Magenta;
            toolStripButtonWrite.Name = "toolStripButtonWrite";
            toolStripButtonWrite.Padding = new Padding(8, 0, 8, 0);
            toolStripButtonWrite.Size = new Size(84, 37);
            toolStripButtonWrite.Text = "JSON \u2192 Code";
            toolStripButtonWrite.Click += toolStripButtonCodeToJson_Click;
            //
            // toolStripButtonCode2Json
            //
            toolStripButtonCode2Json.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonCode2Json.Image = (Image)resources.GetObject("toolStripButtonCode2Json.Image");
            toolStripButtonCode2Json.ImageTransparentColor = Color.Magenta;
            toolStripButtonCode2Json.Name = "toolStripButtonCode2Json";
            toolStripButtonCode2Json.Padding = new Padding(8, 0, 8, 0);
            toolStripButtonCode2Json.Size = new Size(84, 37);
            toolStripButtonCode2Json.Text = "Code \u2192 JSON";
            toolStripButtonCode2Json.Click += toolStripButtonCode2Json_Click;
            //
            // toolStripSeparator1
            //
            toolStripSeparator1.Name = "toolStripSeparator1";
            toolStripSeparator1.Size = new Size(6, 40);
            //
            // toolStripButtonLoadSchema
            //
            toolStripButtonLoadSchema.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonLoadSchema.Image = (Image)resources.GetObject("toolStripButtonLoadSchema.Image");
            toolStripButtonLoadSchema.ImageTransparentColor = Color.Magenta;
            toolStripButtonLoadSchema.Name = "toolStripButtonLoadSchema";
            toolStripButtonLoadSchema.Padding = new Padding(8, 0, 8, 0);
            toolStripButtonLoadSchema.Size = new Size(97, 37);
            toolStripButtonLoadSchema.Text = "Load Schema";
            toolStripButtonLoadSchema.Click += toolStripButtonLoadSchema_Click;
            //
            // toolStripLabelFilePath
            //
            toolStripLabelFilePath.Name = "toolStripLabelFilePath";
            toolStripLabelFilePath.Padding = new Padding(0, 0, 12, 0);
            toolStripLabelFilePath.Size = new Size(86, 37);
            toolStripLabelFilePath.Text = "toolStripLabel1";
            //
            // panel2
            //
            panel2.Controls.Add(webView);
            panel2.Dock = DockStyle.Fill;
            panel2.Location = new Point(0, 40);
            panel2.Name = "panel2";
            panel2.Size = new Size(1121, 621);
            panel2.TabIndex = 2;
            //
            // Form1
            //
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1121, 661);
            Controls.Add(panel2);
            Controls.Add(panel1);
            Name = "Form1";
            Text = "Schema Editor";
            ((System.ComponentModel.ISupportInitialize)webView).EndInit();
            panel1.ResumeLayout(false);
            panel1.PerformLayout();
            toolStrip1.ResumeLayout(false);
            toolStrip1.PerformLayout();
            panel2.ResumeLayout(false);
            ResumeLayout(false);
        }

        #endregion

        private Microsoft.Web.WebView2.WinForms.WebView2 webView;
        private Panel panel1;
        private Panel panel2;
        private ToolStrip toolStrip1;
        private ToolStripButton toolStripButtonWrite;
        private ToolStripButton toolStripButtonCode2Json;
        private ToolStripSeparator toolStripSeparator1;
        private ToolStripLabel toolStripLabelFilePath;
        private ToolStripButton toolStripButtonLoadSchema;
    }
}
