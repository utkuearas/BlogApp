require('dotenv').config();
const { Client } = require('@elastic/elasticsearch');

// Instantiate the client with an API key
const client = new Client({
    node: process.env.ELASTIC_CLOUD, 
    
    auth: {
      apiKey: process.env.ELASTIC_API
    }
});

// Count non deleted users
const count_total_user = async () => {
  const res = await client.count({
    index: 'users',
    query:{
      match: { 
        'is_deleted': false
      }
    }
  });
  return res.count;
}

// Count non deleted and bloggers
const count_bloggers = async () =>{
  const aggResponse = await client.search({
    index: 'posts',
    query: {
      match:{
        is_deleted: false
      }
    },
    aggs: {
      user_ids: {
        terms:{
          field: 'user_id.keyword',
          size: 1e+8
        }
      }
    }
  });
  return aggResponse.aggregations.user_ids.buckets.length;
}

// Count categories with MultiSearch API
const count_categories = async () =>{
  const res = (await client.msearch({
    searches:[
      {index: 'posts'},
      {query: {bool:{ must: [{match: { category: 'Artifical Intelligence'}}, {match: { is_deleted: false}}]} }},
      {index: 'posts'},
      {query: {bool:{ must: [{match: { category: 'Technology'}}, {match: { is_deleted: false}}]} }},
      {index: 'posts'},
      {query: {bool:{ must: [{match: { category: 'Business'}}, {match: { is_deleted: false}}]} }},
      {index: 'posts'},
      {query: {bool:{ must: [{match: { category: 'Money'}}, {match: { is_deleted: false}}]} }},
    ]
  })).responses;
  let ai = res[0].hits.total.value;
  let tech = res[1].hits.total.value;
  let bus = res[2].hits.total.value;
  let money = res[3].hits.total.value;
  return [ai, tech, bus, money]
}

// Build histogram with date_histogram aggregation
const date_histogram = async (interval) =>{
  let range;
  if(interval==='1M'){
    range = {gte: "now-12M", lt: "now"};
  }else if(interval==='1w'){
    range = {gte: "now-4w", lt: "now"};
  }else{
    range = {gte: "now-7d", lt: "now"};
  }
  const res = await client.search({
      index:'posts',
      query:{
        bool:{
          must: [{
            match:{
              is_deleted: false
            }},
            {range:{
              created_at:range
            }}
          ]
        }
      },
      aggs:{
        histogram:{
          date_histogram:{
            calendar_interval:interval,
            field:'created_at'
          },
          aggs:{
            category:{
              terms:{
                field:'category.keyword'
              }
            }
          }
        }
      }
  })
  return res.aggregations.histogram.buckets;
}

const show_category_rates = async (req, res) =>{
  try{
    const data = await count_categories();
    const total = data.reduce((a,b)=> a+b,0);
    let output = {}
    output["ai"] = {rate: data[0] / total, real: data[0]};
    output["tech"] = {rate: data[1] / total, real: data[1]};
    output["business"] = {rate: data[2] / total, real: data[2]};
    output["money"] = {rate: data[3] / total, real: data[3]};
    res.json(output); 
  }catch (err){
    res.status(500).json({code: 12, message: "Something went wrong check your data and try again"});
  }
}

const show_blogger_rates = async (req, res) =>{
  try{
    const total = await count_total_user();
    const bloggers = await count_bloggers();
    let result = {};
    result["blogger"] = {rate: bloggers/total, real: bloggers};
    result["viewer"] = {rate: (total - bloggers) / total, real: total - bloggers};
    res.json(result);
  }catch(err){
    res.status(500).json({code: 12, message: "Something went wrong check your data and try again"});
  }
}

const show_histogram = async (req, res) =>{
  try{
    let { interval } = req.body;
    if(interval === "This Year"){
      interval = "1M";
    }else if(interval === "This Month"){
      interval = "1w";
    }else if(interval === "This Week"){
      interval = "1d";
    }else{
      res.status(404).json({code: 13,message: "Unknown interval"});
      return;
    }
    res.json(await date_histogram(interval));
  }catch(err){
    res.status(500).json({code: 12, message: "Something went wrong check your data and try again"})
  }
}

module.exports = {
  show_category_rates: show_category_rates,
  show_blogger_rates: show_blogger_rates,
  show_histogram: show_histogram
}