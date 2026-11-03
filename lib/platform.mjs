import { query, record, json } from './db.mjs';

export async function network(user) {
  if (!user) return {items:[],directIds:[],secondIds:[]};
  const users = await query("SELECT id,name,avatar,bio,company,city,industry,title,skills,visibility,hide_title FROM users WHERE status='active' AND role='user' AND id<>? ORDER BY id LIMIT 300",[user.id]);
  const activeIds = new Set([user.id,...users.filter(v=>v.visibility!=='hidden').map(v=>v.id)]);
  const connections = await query("SELECT * FROM contacts WHERE status='accepted'");
  const graph = new Map();
  for (const edge of connections) {
    if (json(edge.hidden_by).length || !activeIds.has(edge.requester_id) || !activeIds.has(edge.recipient_id)) continue;
    for (const [a,b] of [[edge.requester_id,edge.recipient_id],[edge.recipient_id,edge.requester_id]]) {
      if (!graph.has(a)) graph.set(a,[]); graph.get(a).push(b);
    }
  }
  const direct = new Set(graph.get(user.id)||[]), second = new Map();
  for (const connector of direct) for (const target of graph.get(connector)||[]) if(target!==user.id&&!direct.has(target)&&!second.has(target)) second.set(target,connector);
  const names = new Map(users.map(v=>[v.id,v.name]));
  const visible = users.filter(v=>v.visibility==='public'||(['contacts','second_degree'].includes(v.visibility)&&direct.has(v.id))||(v.visibility==='second_degree'&&second.has(v.id)));
  const visibleIds = new Set(visible.map(v=>v.id));
  return {
    items:visible.map(v=>({...record(v),title:v.hide_title&&!direct.has(v.id)?'':v.title,degree:direct.has(v.id)?1:second.has(v.id)?2:0,connectorId:second.get(v.id)||null,connectorName:names.get(second.get(v.id))||null,introduction:second.has(v.id)?`可通过 ${names.get(second.get(v.id))||'共同好友'} 申请引荐`:null})),
    directIds:[...direct].filter(id=>visibleIds.has(id)),secondIds:[...second.keys()].filter(id=>visibleIds.has(id)),
  };
}

export async function resources(user, filters = {}) {
  const clauses = [], params = [];
  if(!filters.admin)clauses.push("u.status='active'");
  if (filters.admin) { if(filters.status) {clauses.push('r.status=?');params.push(resourceStatus(filters.status));} }
  else if (filters.mine && user) { clauses.push('r.user_id=?'); params.push(user.id); }
  else {
    clauses.push("r.status='approved'");
    if (user) {
      const n=await network(user); let access="r.visibility='public' OR r.user_id=?"; params.push(user.id);
      if(n.directIds.length) {access+=` OR (r.visibility IN ('contacts','second_degree') AND r.user_id IN (${n.directIds.map(()=>'?').join(',')}))`;params.push(...n.directIds);}
      if(n.secondIds.length) {access+=` OR (r.visibility='second_degree' AND r.user_id IN (${n.secondIds.map(()=>'?').join(',')}))`;params.push(...n.secondIds);}
      clauses.push(`(${access})`);
    } else clauses.push("r.visibility='public'");
  }
  if(filters.id){clauses.push('r.id=?');params.push(filters.id);}
  if(filters.q){clauses.push('(r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ?)');params.push(...Array(3).fill(`%${filters.q}%`));}
  if(filters.category&&!['全部','all','全部资源'].includes(filters.category)){clauses.push('r.category=?');params.push(normalizeCategory(filters.category));}
  if(filters.type){clauses.push('r.type=?');params.push(filters.type);}
  if(filters.favorites&&user){clauses.push('EXISTS(SELECT 1 FROM favorites f WHERE f.resource_id=r.id AND f.user_id=?)');params.push(user.id);}
  const rows=await query(`SELECT r.*,u.name AS owner_name,u.company AS owner_company,u.avatar AS owner_avatar,(SELECT COUNT(*) FROM favorites f WHERE f.resource_id=r.id) AS favorite_count,${user?'EXISTS(SELECT 1 FROM favorites f WHERE f.resource_id=r.id AND f.user_id='+Number(user.id)+')':'0'} AS favorited FROM resources r JOIN users u ON u.id=r.user_id WHERE ${clauses.length?clauses.join(' AND '):'1=1'} ORDER BY r.created_at DESC,r.id DESC LIMIT 150`,params);
  return rows.map(v=>({...record(v),status:v.status==='archived'?'closed':v.status,favorited:Boolean(v.favorited),demo:Boolean(v.demo)}));
}

export const categories = ['全部资源','空间场地','专业技能','设备物品','人脉合作','知识经验','其他资源'];
export const categoryAliases = {'专业服务':'专业技能','设备工具':'设备物品','技能知识':'知识经验','渠道资源':'人脉合作','闲置好物':'设备物品'};
export const normalizeCategory = value => categoryAliases[value] || value;
export const resourceStatus = value => ({published:'approved',closed:'archived'}[value]||value);
export const demandStatus = value => value==='active'?'open':value;

export async function demands(user,filters={}) {
  const clauses=[],params=[];
  clauses.push("u.status='active'");
  if(filters.mine&&user){clauses.push('d.user_id=?');params.push(user.id);}
  else {
    clauses.push("d.status='open'");
    if(user){
      const net=await network(user);let access="d.visibility='public' OR d.user_id=?";params.push(user.id);
      if(net.directIds.length){access+=` OR (d.visibility IN ('contacts','second_degree') AND d.user_id IN (${net.directIds.map(()=>'?').join(',')}))`;params.push(...net.directIds);}
      if(net.secondIds.length){access+=` OR (d.visibility='second_degree' AND d.user_id IN (${net.secondIds.map(()=>'?').join(',')}))`;params.push(...net.secondIds);}
      clauses.push('('+access+')');
    }else clauses.push("d.visibility='public'");
  }
  if(filters.id){clauses.push('d.id=?');params.push(filters.id);}
  if(filters.q){clauses.push('(d.title LIKE ? OR d.description LIKE ?)');params.push('%'+filters.q+'%','%'+filters.q+'%');}
  if(filters.category&&!['all','全部','全部资源'].includes(filters.category)){clauses.push('d.category=?');params.push(normalizeCategory(filters.category));}
  const rows=await query(`SELECT d.*,u.name AS owner_name,u.company AS owner_company FROM demands d JOIN users u ON u.id=d.user_id WHERE ${clauses.join(' AND ')} ORDER BY d.id DESC LIMIT 150`,params);
  return rows.map(v=>({...record(v),status:v.status==='open'?'active':v.status,demo:Boolean(v.demo)}));
}

export async function posts(user,filters={}) {
  const clauses=[],params=[];
  if(filters.admin){if(filters.status){clauses.push('p.status=?');params.push(filters.status);}}
  else if(filters.mine&&user){clauses.push('p.user_id=?');params.push(user.id);}
  else{
    clauses.push("p.status='published'","u.status='active'");
    if(user){const net=await network(user);let access="p.visibility='public' OR p.user_id=?";params.push(user.id);
      if(net.directIds.length){access+=` OR (p.visibility IN ('contacts','second_degree') AND p.user_id IN (${net.directIds.map(()=>'?').join(',')}))`;params.push(...net.directIds);}
      if(net.secondIds.length){access+=` OR (p.visibility='second_degree' AND p.user_id IN (${net.secondIds.map(()=>'?').join(',')}))`;params.push(...net.secondIds);}
      clauses.push('('+access+')');
    }else clauses.push("p.visibility='public'");
  }
  if(filters.id){clauses.push('p.id=?');params.push(filters.id);}
  if(filters.type){clauses.push('p.type=?');params.push(filters.type);}
  if(filters.industry){clauses.push('p.industry=?');params.push(filters.industry);}
  if(filters.q){clauses.push('(p.title LIKE ? OR p.content LIKE ?)');params.push('%'+filters.q+'%','%'+filters.q+'%');}
  const rows=await query(`SELECT p.*,u.name AS owner_name,u.avatar AS owner_avatar,u.company AS owner_company,(SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) AS like_count,(SELECT COUNT(*) FROM post_comments c WHERE c.post_id=p.id) AS comment_count,${user?'EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id='+Number(user.id)+')':'0'} AS liked FROM posts p JOIN users u ON u.id=p.user_id WHERE ${clauses.length?clauses.join(' AND '):'1=1'} ORDER BY p.id DESC LIMIT 150`,params);
  return rows.map(v=>({...record(v),liked:Boolean(v.liked),demo:Boolean(v.demo)}));
}
