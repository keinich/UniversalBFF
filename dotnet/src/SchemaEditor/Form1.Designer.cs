namespace SchemaEditor {
    partial class Form1 {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing) {
            if (disposing && (components != null)) {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent() {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            webView = new Microsoft.Web.WebView2.WinForms.WebView2();
            panel1 = new Panel();
            toolStrip1 = new ToolStrip();
            toolStripButtonWrite = new ToolStripButton();
            toolStripButtonRead = new ToolStripButton();
            toolStripLabelFilePath = new ToolStripLabel();
            panel2 = new Panel();
            toolStripButtonLoadSchema = new ToolStripButton();
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
            webView.Size = new Size(1121, 611);
            webView.Source = new Uri("http://localhost:3000/", UriKind.Absolute);
            webView.TabIndex = 0;
            webView.ZoomFactor = 1D;
            // 
            // panel1
            // 
            panel1.Controls.Add(toolStrip1);
            panel1.Dock = DockStyle.Top;
            panel1.Location = new Point(0, 0);
            panel1.Name = "panel1";
            panel1.Size = new Size(1121, 50);
            panel1.TabIndex = 1;
            // 
            // toolStrip1
            // 
            toolStrip1.Dock = DockStyle.Fill;
            toolStrip1.Items.AddRange(new ToolStripItem[] { toolStripButtonWrite, toolStripButtonRead, toolStripLabelFilePath, toolStripButtonLoadSchema });
            toolStrip1.Location = new Point(0, 0);
            toolStrip1.Name = "toolStrip1";
            toolStrip1.Size = new Size(1121, 50);
            toolStrip1.TabIndex = 0;
            toolStrip1.Text = "toolStrip1";
            // 
            // toolStripButtonWrite
            // 
            toolStripButtonWrite.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonWrite.Image = (Image)resources.GetObject("toolStripButtonWrite.Image");
            toolStripButtonWrite.ImageTransparentColor = Color.Magenta;
            toolStripButtonWrite.Name = "toolStripButtonWrite";
            toolStripButtonWrite.Size = new Size(39, 47);
            toolStripButtonWrite.Text = "Write";
            // 
            // toolStripButtonRead
            // 
            toolStripButtonRead.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonRead.Image = (Image)resources.GetObject("toolStripButtonRead.Image");
            toolStripButtonRead.ImageTransparentColor = Color.Magenta;
            toolStripButtonRead.Name = "toolStripButtonRead";
            toolStripButtonRead.Size = new Size(37, 47);
            toolStripButtonRead.Text = "Read";
            // 
            // toolStripLabelFilePath
            // 
            toolStripLabelFilePath.Name = "toolStripLabelFilePath";
            toolStripLabelFilePath.Size = new Size(86, 47);
            toolStripLabelFilePath.Text = "toolStripLabel1";
            // 
            // panel2
            // 
            panel2.Controls.Add(webView);
            panel2.Dock = DockStyle.Fill;
            panel2.Location = new Point(0, 50);
            panel2.Name = "panel2";
            panel2.Size = new Size(1121, 611);
            panel2.TabIndex = 2;
            // 
            // toolStripButtonLoadSchema
            // 
            toolStripButtonLoadSchema.DisplayStyle = ToolStripItemDisplayStyle.Text;
            toolStripButtonLoadSchema.Image = (Image)resources.GetObject("toolStripButtonLoadSchema.Image");
            toolStripButtonLoadSchema.ImageTransparentColor = Color.Magenta;
            toolStripButtonLoadSchema.Name = "toolStripButtonLoadSchema";
            toolStripButtonLoadSchema.Size = new Size(82, 47);
            toolStripButtonLoadSchema.Text = "Load Schema";
            toolStripButtonLoadSchema.Click += toolStripButtonLoadSchema_Click;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1121, 661);
            Controls.Add(panel2);
            Controls.Add(panel1);
            Name = "Form1";
            Text = "Form1";
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
        private ToolStripButton toolStripButtonRead;
        private ToolStripLabel toolStripLabelFilePath;
        private ToolStripButton toolStripButtonLoadSchema;
    }
}
