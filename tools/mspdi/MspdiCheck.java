// FX-32: open AgentCase's MS Project XML (MSPDI) export with MPXJ, the library ProjectLibre reads MS Project files with, and check what it reads:
// every <Task> of the file is a task with a name, a start and a finish (a finish not before its start), every predecessor link resolves to a
// task of the file, every assignment names a known task and resource. Exits 1 with the reasons when something is not read as written.
// Usage: java -cp '<mpxj jars>/*' tools/mspdi/MspdiCheck.java <file.xml> [...]
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.mpxj.ProjectFile;
import org.mpxj.Relation;
import org.mpxj.ResourceAssignment;
import org.mpxj.Task;
import org.mpxj.mspdi.MSPDIReader;

public class MspdiCheck {
  public static void main(String[] args) throws Exception {
    int bad = 0;
    for (String name : args) {
      List<String> errors = new ArrayList<>();
      String xml = Files.readString(Path.of(name));
      Matcher m = Pattern.compile("<Task>").matcher(xml);
      int written = 0;
      while (m.find()) written++;
      ProjectFile p = new MSPDIReader().read(name);
      List<Task> tasks = new ArrayList<>();
      for (Task t : p.getTasks()) if (t.getUniqueID() != null && t.getUniqueID() != 0) tasks.add(t);   // MPXJ adds the project summary (UID 0) only when the file has it
      int links = 0;
      for (Task t : tasks) {
        String id = "task " + t.getUniqueID();
        if (t.getName() == null || t.getName().isBlank()) errors.add(id + ": no name");
        if (t.getWBS() == null || t.getWBS().isBlank()) errors.add(id + " (" + t.getName() + "): no WBS code");
        if (t.getStart() == null || t.getFinish() == null) errors.add(id + " (" + t.getName() + "): no start or finish");
        else if (t.getFinish().isBefore(t.getStart())) errors.add(id + " (" + t.getName() + "): finish before start");
        for (Relation r : t.getPredecessors()) {
          links++;
          if (r.getPredecessorTask() == null || p.getTaskByUniqueID(r.getPredecessorTask().getUniqueID()) == null) errors.add(id + ": predecessor not in the file");
        }
      }
      int assignments = 0;
      for (ResourceAssignment a : p.getResourceAssignments()) {
        assignments++;
        if (a.getTask() == null) errors.add("assignment " + a.getUniqueID() + ": no task");
        if (a.getResource() == null) errors.add("assignment " + a.getUniqueID() + ": no resource");
      }
      int countWithSummary = p.getTasks().size();
      if (countWithSummary != written && tasks.size() != written) errors.add("tasks read " + tasks.size() + " (with summary " + countWithSummary + ") vs <Task> written " + written);
      System.out.println(name + ": " + tasks.size() + " tasks, " + links + " links, " + p.getResources().size() + " resources, " + assignments
        + " assignments" + (errors.isEmpty() ? " - read as written" : ""));
      for (String e : errors) System.out.println("  " + e);
      if (!errors.isEmpty()) bad++;
    }
    if (bad > 0) { System.out.println(bad + " file(s) not read as written"); System.exit(1); }
  }
}
