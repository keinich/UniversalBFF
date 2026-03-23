using System;
using System.Collections.Generic;
using System.Data.ModelDescription;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    internal static void GenerateJsonFromCode() {
      string outputDir = Path.GetDirectoryName(SchemaJsonFilePath) ?? "";
      string entitiesFilePath = Path.Combine(outputDir, "GeneratedEntities.cs");
      if (!File.Exists(entitiesFilePath))
        throw new Exception($"GeneratedEntities.cs not found at {entitiesFilePath}");

      SchemaRoot schemaRoot = ParseEntitiesCode(File.ReadAllText(entitiesFilePath));
      var jsonOptions = new JsonSerializerOptions { WriteIndented = true };

      //SchemaRoot oldSchemaRoot = LoadSchema();
      

      File.WriteAllText(SchemaJsonFilePath, JsonSerializer.Serialize(schemaRoot, jsonOptions));
    }

    private static SchemaRoot ParseEntitiesCode(string code) {
      var entities = new List<EntitySchema>();
      var allRelations = new List<RelationSchema>();

      var lines = code.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');

      EntitySchema currentEntity = null;
      var pendingRelations = new List<RelationSchema>();
      var pendingIndices = new List<IndexSchema>();
      string pendingPkIndexName = null;
      string pendingEntitySummary = null;
      bool inEntitySummary = false;
      var entitySummaryLines = new List<string>();
      bool inFieldSummary = false;
      var fieldSummaryLines = new List<string>();
      var currentFields = new List<FieldSchema>();

      foreach (var rawLine in lines) {
        string line = rawLine.Trim();

        if (currentEntity == null) {
          // Entity-level doc summary
          if (line == "/// <summary>") { entitySummaryLines.Clear(); inEntitySummary = true; continue; }
          if (inEntitySummary) {
            if (line == "/// </summary>") { inEntitySummary = false; pendingEntitySummary = string.Join(" ", entitySummaryLines); }
            else entitySummaryLines.Add(line.TrimStart('/', ' ').Trim());
            continue;
          }

          // HasLookup
          var m = Regex.Match(line, @"^\[HasLookup\(""([^""]+)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*(?:null|""[^""]*""),\s*""([^""]+)""\)\]$");
          if (m.Success) {
            pendingRelations.Add(new RelationSchema { Name = m.Groups[1].Value, ForeignKeyIndexName = m.Groups[2].Value, PrimaryNavigationName = m.Groups[3].Value, PrimaryEntityName = m.Groups[4].Value, IsLookupRelation = true });
            continue;
          }

          // HasPrincipal
          m = Regex.Match(line, @"^\[HasPrincipal\(""([^""]+)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*(?:null|""[^""]*""),\s*""([^""]+)""\)\]$");
          if (m.Success) {
            pendingRelations.Add(new RelationSchema { Name = m.Groups[1].Value, ForeignKeyIndexName = m.Groups[2].Value, PrimaryNavigationName = m.Groups[3].Value, PrimaryEntityName = m.Groups[4].Value, IsLookupRelation = false });
            continue;
          }

          // PrimaryIdentity
          m = Regex.Match(line, @"^\[PrimaryIdentity\(""([^""]+)""\)\]$");
          if (m.Success) { pendingPkIndexName = m.Groups[1].Value; continue; }

          // UniquePropertyGroup / PropertyGroup
          m = Regex.Match(line, @"^\[(Unique)?PropertyGroup\(""([^""]+)""((?:,\s*""[^""]+"")*)\)\]$");
          if (m.Success) {
            bool unique = m.Groups[1].Value == "Unique";
            string[] fieldNames = Regex.Matches(m.Groups[3].Value, @"""([^""]+)""").Cast<Match>().Select(x => x.Groups[1].Value).ToArray();
            pendingIndices.Add(new IndexSchema { Name = m.Groups[2].Value, Unique = unique, MemberFieldNames = fieldNames });
            continue;
          }

          // Class declaration
          m = Regex.Match(line, @"^public class (\w+)(?:\s*:\s*(\w+))?\s*\{$");
          if (m.Success) {
            currentEntity = new EntitySchema {
              Name = m.Groups[1].Value,
              InheritedEntityName = m.Groups[2].Success ? m.Groups[2].Value : null,
              Summary = pendingEntitySummary ?? "",
              PrimaryKeyIndexName = pendingPkIndexName ?? "",
              Indices = pendingIndices.ToArray(),
            };
            foreach (var rel in pendingRelations) { rel.ForeignEntityName = currentEntity.Name; allRelations.Add(rel); }
            pendingRelations.Clear();
            pendingIndices.Clear();
            pendingPkIndexName = null;
            pendingEntitySummary = null;
            currentFields.Clear();
          }
        } else {
          // Field-level doc summary
          if (line == "/// <summary>") { fieldSummaryLines.Clear(); inFieldSummary = true; continue; }
          if (inFieldSummary) {
            if (line == "/// </summary>") inFieldSummary = false;
            else fieldSummaryLines.Add(line.TrimStart('/', ' ').Trim());
            continue;
          }

          // Property
          var m = Regex.Match(line, @"^public\s+(\S+)\s+(\w+)\s*\{\s*get;\s*set;\s*\}$");
          if (m.Success) {
            string rawType = m.Groups[1].Value;
            bool required = !rawType.EndsWith("?");
            string baseType = rawType.TrimEnd('?');
            if (baseType == "DateTime") baseType = "Date";
            currentFields.Add(new FieldSchema {
              Name = m.Groups[2].Value,
              Type = baseType,
              Required = required,
              Summary = fieldSummaryLines.Count > 0 ? string.Join(" ", fieldSummaryLines) : "",
            });
            fieldSummaryLines.Clear();
            continue;
          }

          // End of class
          if (line == "}") {
            currentEntity.Fields = currentFields.ToArray();
            entities.Add(currentEntity);
            currentEntity = null;
          }
        }
      }

      return new SchemaRoot {
        Entities = entities.ToArray(),
        Relations = allRelations.ToArray(),
        KnownValueRanges = Array.Empty<KnownValueRange>(),
      };
    }

    internal static void GenerateCodeFromJson() {
      SchemaRoot schemaRoot = LoadSchema();
      GenerateEntities(schemaRoot);
      GenerateDbContext(schemaRoot);
      GenerateFuseDatasore(schemaRoot);
    }

    private static void GenerateFuseDatasore(SchemaRoot schemaRoot) {
      string contextName = Path.GetFileNameWithoutExtension(SchemaJsonFilePath);
      string outputDir = Path.GetDirectoryName(SchemaJsonFilePath) ?? "";

      string interfaceCode = GenerateFuseDatastoreInterfaceCode(schemaRoot, contextName);
      File.WriteAllText(Path.Combine(outputDir, $"I{contextName}DataStore.cs"), interfaceCode);

      string implementationCode = GenerateFuseDatastoreImplementationCode(schemaRoot, contextName);
      File.WriteAllText(Path.Combine(outputDir, $"{contextName}EfDataStore.cs"), implementationCode);
    }

    private static string ResolvePkType(EntitySchema entity) {
      if (!string.IsNullOrEmpty(entity.PrimaryKeyIndexName)) {
        var pkIndex = entity.Indices.FirstOrDefault(i => i.Name == entity.PrimaryKeyIndexName);
        if (pkIndex != null && pkIndex.MemberFieldNames.Length == 1) {
          var pkField = entity.Fields.FirstOrDefault(f => f.Name == pkIndex.MemberFieldNames[0]);
          if (pkField != null) {
            return pkField.Type == "Date" ? "DateTime" : pkField.Type;
          }
        }
      }
      return "int";
    }

    private static string GenerateFuseDatastoreInterfaceCode(SchemaRoot schemaRoot, string contextName) {
      var sb = new StringBuilder();
      sb.AppendLine("// <auto-generated />");
      sb.AppendLine();
      sb.AppendLine("using GeneratedEntities;");
      sb.AppendLine("using System.Data.Fuse;");
      sb.AppendLine();
      sb.AppendLine($"namespace {contextName} {{");
      sb.AppendLine($"  public interface I{contextName}DataStore {{");

      foreach (var entity in schemaRoot.Entities) {
        string pkType = ResolvePkType(entity);
        string setName = !string.IsNullOrEmpty(entity.NamePlural) ? entity.NamePlural : entity.Name + "s";
        sb.AppendLine($"    IRepository<{entity.Name}, {pkType}> {setName} {{ get; }}");
      }

      sb.AppendLine("  }");
      sb.AppendLine("}");
      return sb.ToString();
    }

    private static string GenerateFuseDatastoreImplementationCode(SchemaRoot schemaRoot, string contextName) {
      var sb = new StringBuilder();
      sb.AppendLine("// <auto-generated />");
      sb.AppendLine();
      sb.AppendLine("using GeneratedDbContext;");
      sb.AppendLine("using GeneratedEntities;");
      sb.AppendLine("using System.Data.Fuse;");
      sb.AppendLine("using System.Data.Fuse.Ef;");
      sb.AppendLine("using System.Data.Fuse.Ef.InstanceManagement;");
      sb.AppendLine();
      sb.AppendLine($"namespace {contextName} {{");
      sb.AppendLine($"  public class {contextName}EfDataStore");
      sb.AppendLine($"    : EfDataStore<{contextName}DbContext>, I{contextName}DataStore {{");
      sb.AppendLine();
      sb.AppendLine($"    public {contextName}EfDataStore(");
      sb.AppendLine("      IDbContextInstanceProvider contextInstanceProvider");
      sb.AppendLine("    ) : base(contextInstanceProvider) {");
      sb.AppendLine("    }");
      sb.AppendLine();

      foreach (var entity in schemaRoot.Entities) {
        string pkType = ResolvePkType(entity);
        string setName = !string.IsNullOrEmpty(entity.NamePlural) ? entity.NamePlural : entity.Name + "s";
        sb.AppendLine($"    public IRepository<{entity.Name}, {pkType}> {setName} => GetRepository<{entity.Name}, {pkType}>();");
      }

      sb.AppendLine("  }");
      sb.AppendLine("}");
      return sb.ToString();
    }

    private static void GenerateDbContext(SchemaRoot schemaRoot) {
      string contextName = Path.GetFileNameWithoutExtension(SchemaJsonFilePath);
      string dbContextCode = GenerateDbContextCsCode(schemaRoot, contextName);
      string outputPath = Path.Combine(
        Path.GetDirectoryName(SchemaJsonFilePath) ?? "",
        $"{contextName}DbContext.cs"
      );
      File.WriteAllText(outputPath, dbContextCode);
    }

    private static void GenerateEntities(SchemaRoot schemaRoot) {
      string entitiesCsCode = GenerateEntitesCsCode(schemaRoot);
      string outputPath = Path.Combine(
        Path.GetDirectoryName(SchemaJsonFilePath) ?? "",
        "GeneratedEntities.cs"
      );
      File.WriteAllText(outputPath, entitiesCsCode);
    }

    internal static void GenerateDbContextFromJson() {
      SchemaRoot schemaRoot = LoadSchema();
      string contextName = Path.GetFileNameWithoutExtension(SchemaJsonFilePath);
      string dbContextCode = GenerateDbContextCsCode(schemaRoot, contextName);
      string outputPath = Path.Combine(
        Path.GetDirectoryName(SchemaJsonFilePath) ?? "",
        $"{contextName}DbContext.cs"
      );
      File.WriteAllText(outputPath, dbContextCode);
    }

    private static string GenerateEntitesCsCode(SchemaRoot schemaRoot) {
      var sb = new StringBuilder();
      sb.AppendLine("// <auto-generated />");
      sb.AppendLine();
      sb.AppendLine("using System;");
      sb.AppendLine("using System.Data.ModelDescription;");
      sb.AppendLine("using System.ComponentModel.DataAnnotations;");
      sb.AppendLine();
      sb.AppendLine("namespace GeneratedEntities {");
      sb.AppendLine();

      var relationsByForeignEntity = schemaRoot.Relations
        .GroupBy(r => r.ForeignEntityName)
        .ToDictionary(g => g.Key, g => g.ToList());

      foreach (var entity in schemaRoot.Entities) {
        if (!string.IsNullOrEmpty(entity.Summary)) {
          sb.AppendLine("  /// <summary>");
          sb.AppendLine($"  /// {entity.Summary}");
          sb.AppendLine("  /// </summary>");
        }

        if (relationsByForeignEntity.TryGetValue(entity.Name, out var relations)) {
          foreach (var rel in relations) {
            if (!string.IsNullOrEmpty(rel.ForeignKeyIndexName)) {
              bool hasIndex = entity.Indices.Any(i => i.Name == rel.ForeignKeyIndexName);
              bool hasField = !hasIndex && entity.Fields.Any(f => f.Name == rel.ForeignKeyIndexName);
              if (hasField) {
                sb.AppendLine($"  [PropertyGroup(\"{rel.ForeignKeyIndexName}\", \"{rel.ForeignKeyIndexName}\")]");
              }
            }
            if (rel.IsLookupRelation) {
              sb.AppendLine($"  [HasLookup(\"{rel.Name}\", \"{rel.ForeignKeyIndexName}\", \"{rel.PrimaryNavigationName}\", null, \"{rel.PrimaryEntityName}\")]");
            } else {
              sb.AppendLine($"  [HasPrincipal(\"{rel.Name}\", \"{rel.ForeignKeyIndexName}\", \"{rel.PrimaryNavigationName}\", null, \"{rel.PrimaryEntityName}\")]");
            }
          }
        }

        if (!string.IsNullOrEmpty(entity.PrimaryKeyIndexName)) {
          sb.AppendLine($"  [PrimaryIdentity(\"{entity.PrimaryKeyIndexName}\")]");
        }

        foreach (var index in entity.Indices) {
          string attrName = index.Unique ? "UniquePropertyGroup" : "PropertyGroup";
          string fields = string.Join(", ", index.MemberFieldNames.Select(f => $"\"{f}\""));
          sb.AppendLine($"  [{attrName}(\"{index.Name}\", {fields})]");
        }

        string baseClass = string.IsNullOrEmpty(entity.InheritedEntityName)
          ? ""
          : $" : {entity.InheritedEntityName}";

        sb.AppendLine($"  public class {entity.Name}{baseClass} {{");
        sb.AppendLine();

        foreach (var field in entity.Fields) {
          if (!string.IsNullOrEmpty(field.Summary)) {
            sb.AppendLine("    /// <summary>");
            sb.AppendLine($"    /// {field.Summary}");
            sb.AppendLine("    /// </summary>");
          }

          string resolvedType = field.Type == "Date" ? "DateTime" : field.Type;
          string typeName = field.Required ? resolvedType : $"{resolvedType}?";
          sb.AppendLine($"    public {typeName} {field.Name} {{ get; set; }}");
          sb.AppendLine();
        }

        sb.AppendLine("  }");
        sb.AppendLine();
      }

      sb.AppendLine("}");
      return sb.ToString();
    }

    private static string GenerateDbContextCsCode(SchemaRoot schemaRoot, string contextName) {
      var sb = new StringBuilder();
      var entityDict = schemaRoot.Entities.ToDictionary(e => e.Name);

      sb.AppendLine("// <auto-generated />");
      sb.AppendLine();
      sb.AppendLine("using System;");
      sb.AppendLine("using Microsoft.EntityFrameworkCore;");
      sb.AppendLine("using GeneratedEntities;");
      sb.AppendLine();
      sb.AppendLine("namespace GeneratedDbContext {");
      sb.AppendLine();
      sb.AppendLine($"  public class {contextName}DbContext : DbContext {{");
      sb.AppendLine();

      // Connection string field + property
      sb.AppendLine($"    private static string _ConnectionString = @\"Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog={contextName};Integrated Security=True;\";");
      sb.AppendLine();
      sb.AppendLine("    public static string ConnectionString { set => _ConnectionString = value; }");
      sb.AppendLine();

      // OnConfiguring
      sb.AppendLine("    protected override void OnConfiguring(DbContextOptionsBuilder options) {");
      sb.AppendLine("      options.UseLazyLoadingProxies();");
      sb.AppendLine("      options.UseSqlServer(_ConnectionString);");
      sb.AppendLine("    }");
      sb.AppendLine();

      // Migrate
      sb.AppendLine($"    public static void Migrate() {{");
      sb.AppendLine($"      using var ctx = new {contextName}DbContext();");
      sb.AppendLine("      ctx.Database.Migrate();");
      sb.AppendLine("    }");
      sb.AppendLine();

      // DbSet properties
      foreach (var entity in schemaRoot.Entities) {
        string setName = !string.IsNullOrEmpty(entity.NamePlural) ? entity.NamePlural : entity.Name + "s";
        sb.AppendLine($"    public DbSet<{entity.Name}> {setName} {{ get; set; }}");
      }

      sb.AppendLine();
      sb.AppendLine("    protected override void OnModelCreating(ModelBuilder modelBuilder) {");

      // Per-entity configuration
      foreach (var entity in schemaRoot.Entities) {
        sb.AppendLine();
        sb.AppendLine($"      modelBuilder.Entity<{entity.Name}>(entity => {{");

        // Primary key
        if (!string.IsNullOrEmpty(entity.PrimaryKeyIndexName)) {
          var pkIndex = entity.Indices.FirstOrDefault(i => i.Name == entity.PrimaryKeyIndexName);
          if (pkIndex != null && pkIndex.MemberFieldNames.Length > 0) {
            if (pkIndex.MemberFieldNames.Length == 1) {
              sb.AppendLine($"        entity.HasKey(e => e.{pkIndex.MemberFieldNames[0]});");
            } else {
              string keyFields = string.Join(", ", pkIndex.MemberFieldNames.Select(f => $"e.{f}"));
              sb.AppendLine($"        entity.HasKey(e => new {{ {keyFields} }});");
            }
          }
        }

        // Non-PK indices
        foreach (var index in entity.Indices.Where(i => i.Name != entity.PrimaryKeyIndexName)) {
          string indexExpr = index.MemberFieldNames.Length == 1
            ? $"e => e.{index.MemberFieldNames[0]}"
            : $"e => new {{ {string.Join(", ", index.MemberFieldNames.Select(f => $"e.{f}"))} }}";
          string uniquePart = index.Unique ? ".IsUnique()" : "";
          sb.AppendLine($"        entity.HasIndex({indexExpr}){uniquePart}.HasDatabaseName(\"{index.Name}\");");
        }

        // Required / max-length constraints from fields
        foreach (var field in entity.Fields) {
          if (field.Required) {
            sb.AppendLine($"        entity.Property(e => e.{field.Name}).IsRequired();");
          }
          if (field.MaxLength > 0) {
            sb.AppendLine($"        entity.Property(e => e.{field.Name}).HasMaxLength({field.MaxLength});");
          }
        }

        sb.AppendLine("      });");
      }

      // Relations
      foreach (var rel in schemaRoot.Relations) {
        // Resolve FK fields from the foreign entity's index or direct field
        string[] fkFields = Array.Empty<string>();
        if (!string.IsNullOrEmpty(rel.ForeignKeyIndexName) &&
            entityDict.TryGetValue(rel.ForeignEntityName, out var foreignEntity)) {
          var fkIndex = foreignEntity.Indices.FirstOrDefault(i => i.Name == rel.ForeignKeyIndexName);
          fkFields = fkIndex != null
            ? fkIndex.MemberFieldNames
            : foreignEntity.Fields.Any(f => f.Name == rel.ForeignKeyIndexName)
              ? new[] { rel.ForeignKeyIndexName }
              : Array.Empty<string>();
        }

        string fkExpr = fkFields.Length == 1
          ? $"e => e.{fkFields[0]}"
          : fkFields.Length > 1
            ? $"e => new {{ {string.Join(", ", fkFields.Select(f => $"e.{f}"))} }}"
            : $"\"{rel.ForeignKeyIndexName}\"";

        string withSide = rel.ForeignEntityIsMultiple ? ".WithMany()" : ".WithOne()";
        string deleteBehavior = rel.CascadeDelete ? "DeleteBehavior.Cascade" : "DeleteBehavior.Restrict";
        string isRequired = (!rel.PrimaryEntityIsOptional).ToString().ToLower();

        sb.AppendLine();
        sb.AppendLine($"      // {rel.Name}");
        sb.AppendLine($"      modelBuilder.Entity<{rel.ForeignEntityName}>()");
        sb.AppendLine($"        .HasOne<{rel.PrimaryEntityName}>()");
        sb.AppendLine($"        {withSide}");
        sb.AppendLine($"        .HasForeignKey({fkExpr})");
        sb.AppendLine($"        .IsRequired({isRequired})");
        sb.AppendLine($"        .OnDelete({deleteBehavior});");
      }

      sb.AppendLine("    }");
      sb.AppendLine("  }");
      sb.AppendLine("}");
      return sb.ToString();
    }
  }
}
