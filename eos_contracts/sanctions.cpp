#include <eosio/eosio.hpp>

using namespace eosio;

// $ cleos push action sanctions upsert '["BOSCO TAGANDA", "1974", "GB", "QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4"]'

class [[eosio::contract("sanctions")]] sanctions : public eosio::contract {

public:
  
  // reciever, code, datastream
  sanctions(name receiver, name code,  datastream<const char*> ds): contract(receiver, code, ds) {}

  [[eosio::action]]
  void upsert(std::string full_name, std::string birth_year, std::string nationality, std::string ipfs_hash) {
    
    require_auth(user);
    individual_index individuals(get_self(), get_first_receiver().value);
    
    auto iterator = individuals.find(user.value);
    
    if (iterator == individuals.end()) {
      individuals.emplace(user, [&]( auto& row ) {
       row.key = ipfs_hash;
       row.full_name = full_name;
       row.birth_year = birth_year;
       row.nationality = nationality;
      });
    } else {
      individuals.modify(iterator, user, [&]( auto& row ) {
        row.key = ipfs_hash;
        row.full_name = full_name;
        row.birth_year = birth_year;
        row.nationality = nationality;
      });
    }
  }

  [[eosio::action]]
  void erase(name user) {
    require_auth(user);

    individual_index individuals( get_self(), get_first_receiver().value);

    auto iterator = individuals.find(user.value);
    check(iterator != individuals.end(), "Individual not sanctioned");
    individuals.erase(iterator);
  }

private:
  struct [[eosio::table]] individual {
    std::string full_name;
    std::string birth_year;
    std::string nationality;
    std::string ipfs_hash;
    uint64_t primary_key() const { return key.value; }
  };
  
  typedef eosio::multi_index<"individuals"_n, individual> individual_index;

};    