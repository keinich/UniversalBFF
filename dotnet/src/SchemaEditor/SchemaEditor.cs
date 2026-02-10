using System;
using System.Collections.Generic;
using System.Data.ModelDescription;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace SchemaEditor {
  internal class SchemaEditor {
    public static string SchemaJsonFilePath { get; internal set; } = "";

    public static void SaveSchema(string schemaData) {

      var options = new JsonSerializerOptions {
        PropertyNameCaseInsensitive = true
      };

      SchemaRoot? schemaRoot = JsonSerializer.Deserialize<SchemaRoot>(
        schemaData, options
      );
      if (schemaRoot == null) {
        throw new Exception("Failed to deserialize schema data.");
      }

      File.WriteAllText(SchemaJsonFilePath, schemaData);

    }
    internal static string LoadSchemaJson() {
      if (string.IsNullOrEmpty(SchemaJsonFilePath) || !File.Exists(SchemaJsonFilePath)) {
        throw new Exception(
          "Schema JSON file path is not set or file does not exist."
        );
      }
      string jsonData = File.ReadAllText(SchemaJsonFilePath);
      return jsonData;

    }

    internal static SchemaRoot LoadSchema() {
      if (string.IsNullOrEmpty(SchemaJsonFilePath) || !File.Exists(SchemaJsonFilePath)) {
        throw new Exception(
          "Schema JSON file path is not set or file does not exist."
        );
      }
      string jsonData = File.ReadAllText(SchemaJsonFilePath);
      var options = new JsonSerializerOptions {
        PropertyNameCaseInsensitive = true
      };
      SchemaRoot schemaRoot = JsonSerializer.Deserialize<SchemaRoot>(jsonData, options)
        ?? throw new Exception("Failed to deserialize schema JSON.");
      return schemaRoot;

    }
  }
}
