import DodoPayments from 'dodopayments';

const dodo = new DodoPayments({
  bearerToken: 'test_token',
});

function getPrototypeMethods(obj: any) {
  const proto = Object.getPrototypeOf(obj);
  if (!proto) return [];
  return Object.getOwnPropertyNames(proto).filter(name => typeof proto[name] === 'function');
}

console.log("Customers service methods:", getPrototypeMethods(dodo.customers));
console.log("CustomerPortal service methods:", getPrototypeMethods(dodo.customers.customerPortal));
console.log("CheckoutSessions service methods:", getPrototypeMethods(dodo.checkoutSessions));
console.log("Subscriptions service methods:", getPrototypeMethods(dodo.subscriptions));
