using System;
using System.Collections.Generic;
using System.Data.ModelDescription;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace SchemaEditor {

  public class Position {
    public double X { get; set; }
    public double Y { get; set; }
  }

  public class NodeData {
    public int Id {get; set;}
    public int NumInputs {get; set;}
    public int NumOutputs {get; set;}
    public Position PreviousPosition {get; set;}
    public Position CurrentPosition {get; set;}
    public string[] InputEdgeIds {get; set;}
    public string[] OutputEdgeIds {get; set;}
    public EntitySchema EntitySchema {get; set;}
    public string Color { get; set; }
  }

  public class EdgeData {
    public string Id { get; set; }
    public int NodeStartId { get; set; }
    public int NodeEndId { get; set; }
    public string InputFieldName { get; set; }
    public string OutputFieldName { get; set; }
    public RelationSchema Relation { get; set; }
    public Position PreviousStartPosition { get; set; }
    public Position CurrentStartPosition { get; set; }
    public Position PreviousEndPosition { get; set; }
    public Position CurrentEndPosition { get; set; }
    public string EdgeType { get; set; }
  }

  public class DesignerData {
    public NodeData[] Nodes { get; set; } = { };
    public EdgeData[] Edges { get; set; } = { };
  }
}
