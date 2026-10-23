import { Badge, Table, money } from '../../ui';
import * as api from '../../services/api';
import { pname } from '../../components/common';

export default function SellerSales(){const db=api.useDb();const rows=db.orders.map(o=>({...o,project:pname(db,o.projectId),net:o.amount-(o.commission||0)-o.amount*db.settings.processingRate}));
  return <div><h1>Sales and orders</h1><Table rows={rows} cols={[
    ['id','Order'],['project','Project'],['date','Date'],['amount','Gross',r=>money(r.amount)],['commission','Commission',r=>money(r.commission||0)],['net','Estimated net',r=>money(r.net)],['status','Status',r=><Badge s={r.status}/>]
  ]}/></div>;
}
