#include <eosio/eosio.hpp>

using namespace eosio;

class [[eosio::contract("sanctions")]] sanctions : public contract {
  public:
    using contract::contract;

    [[eosio::action]]
    void insert( name usertest ) {
        print( "insert");
    }

    [[eosio::action]]
      void search( name usertesttwo ) {
         print( "search");
    }
      
};