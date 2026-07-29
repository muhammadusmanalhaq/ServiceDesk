const fs = require('fs');
const file = 'src/servicedesk-web/src/components/TicketDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add handleAssign function
const assignFunc = `  const handleAssign = async (userId: string) => {
    try {
      const res = await apiFetch.POST("/api/tickets/{id}/assign", {
        params: { path: { id: ticket.id } },
        body: { userId } as any
      });
      if (!res.error) {
        onTicketUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {`;

content = content.replace('  const handleUpdateStatus = async (newStatus: string) => {', assignFunc);

// Add Assignee dropdown in the UI
const assigneeUI = `            <div>
               <h4 className="text-xs font-medium text-zinc-500">Priority</h4>
               <span className="inline-block mt-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                 {ticket.priority}
               </span>
            </div>
            <div>
               <h4 className="text-xs font-medium text-zinc-500">Assignee</h4>
               <div className="mt-1">
                 {(user?.role === "Admin" || user?.role === "Manager") ? (
                   <select 
                     value={ticket.assignedToUserId || ""} 
                     onChange={(e) => handleAssign(e.target.value)}
                     className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm rounded px-2 py-1 w-full max-w-[200px]"
                   >
                     <option value="">Unassigned</option>
                     {Object.values(users).map((u: any) => (
                       <option key={u.id} value={u.id}>{u.fullName}</option>
                     ))}
                   </select>
                 ) : (
                   <span className="inline-block px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">
                     {ticket.assignedToUserId && users[ticket.assignedToUserId] ? users[ticket.assignedToUserId].fullName : "Unassigned"}
                   </span>
                 )}
               </div>
            </div>`;

content = content.replace(/            <div>\s*<h4 className="text-xs font-medium text-zinc-500">Priority<\/h4>\s*<span className="inline-block mt-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded">\s*\{ticket\.priority\}\s*<\/span>\s*<\/div>/, assigneeUI);

// change grid cols from 2 to 3
content = content.replace(/className="grid grid-cols-2 gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4"/g, 'className="grid grid-cols-3 gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4"');

fs.writeFileSync(file, content);
