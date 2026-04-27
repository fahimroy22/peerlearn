import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  assignSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
} from "../api/adminApi";
import useToast from "../context/useToast";

function AdminSupportTickets() {
  const { showToast } = useToast();

  const [tickets,setTickets]=useState([]);
  const [loading,setLoading]=useState(true);
  const [workingId,setWorkingId]=useState("");

  const [status,setStatus]=useState("");
  const [priority,setPriority]=useState("");
  const [category,setCategory]=useState("");
  const [search,setSearch]=useState("");

  const fetchTickets = async () => {
    try{
      setLoading(true);

      const data = await getAllSupportTickets({
        status,
        priority,
        category,
        search,
      });

      setTickets(data || []);
    }catch(error){
      console.error(error);
      showToast("Failed loading tickets","error");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    const timer=setTimeout(fetchTickets,250);
    return ()=>clearTimeout(timer);
  },[status,priority,category,search]);

  const handleAssign=async(id)=>{
    try{
      setWorkingId(id);
      await assignSupportTicket(id);
      showToast("Ticket assigned","success");
      fetchTickets();
    }catch{
      showToast("Failed assigning ticket","error");
    }finally{
      setWorkingId("");
    }
  };

  const updateStatus=async(id,newStatus)=>{
    try{
      setWorkingId(id);
      await updateSupportTicketStatus(id,newStatus);
      showToast("Ticket updated","success");
      fetchTickets();
    }catch{
      showToast("Failed updating ticket","error");
    }finally{
      setWorkingId("");
    }
  };

  return (
<div className="page">
<div className="au-page">

<section className="au-header">
<div className="au-eyebrow">Admin</div>
<h1 className="au-title">
Support Ticket Management
</h1>
<p className="au-subtitle">
Filter, assign and manage support workflow.
</p>
</section>

<section className="au-toolbar">

<input
className="au-search"
placeholder="Search tickets..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<select
className="au-filter"
value={status}
onChange={(e)=>setStatus(e.target.value)}
>
<option value="">All Status</option>
<option value="open">Open</option>
<option value="in_progress">In Progress</option>
<option value="resolved">Resolved</option>
<option value="closed">Closed</option>
</select>

<select
className="au-filter"
value={priority}
onChange={(e)=>setPriority(e.target.value)}
>
<option value="">All Priority</option>
<option value="low">Low</option>
<option value="medium">Medium</option>
<option value="high">High</option>
</select>

<select
className="au-filter"
value={category}
onChange={(e)=>setCategory(e.target.value)}
>
<option value="">All Categories</option>
<option value="login">Login</option>
<option value="listing">Listing</option>
<option value="session">Session</option>
<option value="exchange">Exchange</option>
<option value="bug">Bug</option>
</select>

</section>

{loading ? (
<div className="au-empty">
Loading tickets...
</div>
): tickets.length===0 ? (
<div className="au-empty">
No tickets found.
</div>
):(
<section className="au-list">

{tickets.map(ticket=>(

<article
key={ticket._id}
className="au-card"
>

<div className="au-user">

<div className="au-avatar">
{ticket.subject?.charAt(0).toUpperCase()}
</div>

<div className="au-main">

<div className="au-top">
<div className="au-name">
{ticket.subject}
</div>

<span className="au-badge role-admin">
{ticket.category}
</span>

<span className="au-badge">
{ticket.status}
</span>

</div>

<div className="au-meta">
<span>{ticket.user?.name}</span>
<span>{ticket.priority} priority</span>

{ticket.assignedAdmin &&
<span>
Assigned: {ticket.assignedAdmin.name}
</span>
}
</div>

</div>
</div>

<div className="au-actions">

<button
className="au-btn logout"
disabled={workingId===ticket._id}
onClick={()=>handleAssign(ticket._id)}
>
Assign
</button>

<button
className="au-btn block"
disabled={workingId===ticket._id}
onClick={()=>updateStatus(ticket._id,"in_progress")}
>
In Progress
</button>

<button
className="au-btn unblock"
disabled={workingId===ticket._id}
onClick={()=>updateStatus(ticket._id,"resolved")}
>
Resolve
</button>

<Link to={`/admin/support/${ticket._id}`}>
<button className="au-btn">
Open
</button>
</Link>

</div>

</article>

))}

</section>
)}

</div>
</div>
  );
}

export default AdminSupportTickets;