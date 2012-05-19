require 'rubygems'
require 'sinatra'
require 'omniauth'
require 'omniauth-twitter'
require "sinatra/reloader" if development? #auto-reload on development
require "sinatra/config_file"
require 'twitter'
require 'json'

config_file 'config/twitter.yml'

use Rack::Logger
use OmniAuth::Builder do
  provider :twitter, ENV["consumer_key"] || settings.consumer_key, ENV["consumer_secret"] || settings.consumer_secret
end

enable :sessions

configure :production do
  require 'newrelic_rpm'
end
 
helpers do
  def logger
    request.logger
  end
  
  #Generic error response
  def error_response(error)
    content_type :json
    status 400
    {:result => 'error', :message => error.message}.to_json
  end
end

def client
  Twitter.configure do |config|
    config.consumer_key = ENV["consumer_key"] || settings.consumer_key
    config.consumer_secret = ENV["consumer_secret"] || settings.consumer_secret
    config.oauth_token = session[:oauth]['access_token']
    config.oauth_token_secret = session[:oauth]['access_secret']
    config.gateway = ENV['APIGEE_TWITTER_API_ENDPOINT'] || settings.apigee_endpoint
  end
  @client ||= Twitter::Client.new(:oauth_token => session[:oauth]['access_token'], :oauth_token_secret =>session[:oauth]['access_secret'])
end

# OAUTH 
get '/auth/:provider/callback' do
  auth = request.env["omniauth.auth"]
  session[:oauth]['access_token'] = auth['credentials']['token']
  session[:oauth]['access_secret'] = auth['credentials']['secret']
  logger.info client.inspect
  user = client.verify_credentials       
  redirect '/'
end

get '/auth/failure' do
  erb "<h1>Authentication Failed:</h1><h3>message:<h3> <pre>#{params}</pre>"
end

get '/auth/:provider/deauthorized' do
  erb "#{params[:provider]} has deauthorized this app."
end

get '/protected' do
  throw(:halt, [401, "Not authorized\n"]) unless session[:authenticated]
  erb "<pre>#{request.env['omniauth.auth'].to_json}</pre><hr>
       <a href='/logout'>Logout</a>"
end

get "/logout" do
  logger.info "/logout"
  session[:oauth] = false
  session[:authenticated] = false
  @client = ""
  redirect "/"
end
  
get '/' do
  File.read(File.join('public', 'index.html'))
end

# Twitter API 
#Get logged in user information
get '/user' do
  begin
    current_user = client.current_user
  
    content_type :json
    current_user.attrs['attrs'].to_json
  
  rescue Twitter::Error => e
    error_response e
  end
end

#Create new list
post '/lists/:user_name' do
  begin
    payload = request.body.read
    params = JSON.parse(payload)
    logger.info params
    list_name = params["name"].to_s
    list_mode = params["mode"].to_s
    logger.info "posts lists/"
    
    new_list = Twitter.list_create(list_name, {:mode => list_mode})
    
    content_type :json
    new_list.attrs.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end

#Get lists for a specific user
get '/lists/:user_name' do
  begin
    user_name = params[:user_name]
    cache_key = '/lists/' + user_name
    logger.info cache_key +" going to twitter"
    
    twitter_lists = client.lists_subscribed_to(user_name).map{|list| list.attrs}.to_json 

    content_type :json
    twitter_lists
    
  rescue Twitter::Error => e
    error_response e
  end
end

#Update a list
put '/lists/:user_id/:list_id' do
  begin
    list_id = params["list_id"]
    payload = request.body.read
    params = JSON.parse(payload)
    list_mode = params["mode"]
    list_name = params["name"]
    new_user_id = params["new_user_id"]
    unlink_user_id = params["unlink_user_id"]
    
    #add user to a list
    if !new_user_id.nil? && !new_user_id.empty? 
      logger.info "new_user_id " + new_user_id
      response = Twitter.list_add_members(list_id.to_i, [new_user_id.to_i])
    #remove user from list  
    elsif !unlink_user_id.nil? && !unlink_user_id.empty? 
      logger.info "unlink_user_id " + unlink_user_id
      response = Twitter.list_remove_member(list_id.to_i, unlink_user_id.to_i)  
    #update lists attributes
    else
      logger.info "list_update " + list_name  
      response = Twitter.list_update(list_id.to_i, :mode=>list_mode, :name=>list_name)
    end
    
    content_type :json
    response.attrs.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end

#put '/list/:list_id/
#post '/list/:list_id/:user_id'
#delete '/list/:list_id/:user_id'

#Delete a list
#delete'/lists/:list_id
delete '/lists/:user_id/:list_id' do
  begin
    user_id = params["user_id"]
    list_id = params["list_id"]
    
    response = Twitter.list_destroy(list_id.to_i)
    
    content_type :json
    response.attrs.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end

#Get list members
#get 'list/:list_id/
get '/list/members/' do
  begin
    user = params[:user].to_s
    list_slug = params[:slug].to_s
    cursor = params[:cursor] ? params[:cursor] : -1
    cache_key = 'members/'+list_slug +'/'+ user +'/'+ cursor.to_s
    logger.info cache_key +" going to twitter"
    
    members = client.list_members(user, list_slug, {:cursor=> cursor, :skip_status=>1})
    
    content_type :json
    members.attrs.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end

#Get the friends for a specific user
get '/friends/:user_id' do
  begin
    user_id = params[:user_id]
    cache_key = '/friends/' + user_id
    logger.info cache_key + 'going to twitter'
    
    friends = client.friend_ids(user_id)
    
    content_type :json
    friends.attrs.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end

#Get user details for a list of ids
get '/users/:user_id' do
  begin
    user_id = params[:user_id]
    ids = user_id.split(",")
    
    users = client.users(ids.map{|x| x.to_i}) 
    
    content_type :json
    users.map{|user| user.attrs}.to_json
    
  rescue Twitter::Error => e
    error_response e
  end
end